import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitDirArgSchema } from './git-dir.schema.js';
import { gitExec, safeRef } from './git-exec.js';

/**
 * Args for `GitRebaseTool`: the ref to rebase `onto`.
 *
 * @public
 */
export type GitRebaseArgs = {
  onto: string;
  dir?: string;
};

/**
 * Result for `GitRebaseTool`: whether the rebase finished, and the unmerged files when it stopped.
 *
 * @public
 */
export type GitRebaseResult = {
  clean: boolean;
  /** The files the rebase stopped on. The rebase is left in progress, so whoever resolves them can finish it. */
  conflicts?: string[];
};

/**
 * Zod schema for `GitRebaseResult`.
 *
 * @public
 */
export const GitRebaseResultSchema = z.strictObject({
  clean: z.boolean(),
  conflicts: z.array(z.string()).optional(),
});

/**
 * Tool that rebases the current branch onto another ref.
 *
 * There are three outcomes and they are told apart on purpose. A rebase that finishes answers `clean`. A
 * rebase that stops on conflicting files answers those files and **leaves the rebase in progress**, so an
 * agent or a person can resolve them and run `git rebase --continue` in the same checkout. A rebase that
 * fails for any other reason is aborted here — leaving no half-finished state behind — and reported as an
 * error with git's own output, because nobody can act on it.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_rebase',
  description:
    'Rebases the current branch onto another ref. Returns { clean: true } when it finished, or the unmerged ' +
    'files with the rebase left in progress. Any other failure is aborted and reported as an error.',
  schema: z
    .object({
      onto: z.string().describe('The ref to rebase onto, e.g. origin/main.'),
      dir: GitDirArgSchema,
    })
    .strict(),
  resultSchema: GitRebaseResultSchema,
  effects: 'external',
})
export class GitRebaseTool extends BaseTool<GitRebaseArgs, object, GitRebaseResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitRebaseArgs): Promise<ToolEnvelope<GitRebaseResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const exec = (command: string) => gitExec(this.remote, agentUrl, command, args.dir);

    const onto = safeRef(args.onto);
    const rebased = await exec(`git rebase ${onto}`);
    if (rebased.exitCode === 0) return { data: { clean: true } };

    const conflicts = (await exec('git diff --name-only --diff-filter=U')).stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (conflicts.length) return { data: { clean: false, conflicts } };

    await exec('git rebase --abort');
    const output = (rebased.stderr || rebased.stdout).slice(-2000);
    return { data: { clean: false }, error: `the rebase onto \`${onto}\` failed:\n${output}` };
  }
}
