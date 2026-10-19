import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitDirArgSchema } from './git-dir.schema.js';
import { type GitTargetConfig, GitTargetConfigSchema, gitExec, gitRun, safeRef, targetAgentUrl } from './git-exec.js';

/**
 * Args for `GitCheckoutStateTool`: optionally the `baseRef` to measure the checkout against.
 *
 * @public
 */
export type GitCheckoutStateArgs = {
  baseRef?: string;
  dir?: string;
};

/**
 * Result for `GitCheckoutStateTool`: what state the checkout is in, and where it stands against `baseRef`.
 *
 * @public
 */
export type GitCheckoutStateResult = {
  /** The branch, or `HEAD (no branch)` when the checkout is detached or mid-rebase. */
  branch: string;
  /** A rebase was started and has not finished. */
  rebaseInProgress: boolean;
  /** The working tree or the index differs from HEAD. */
  dirty: boolean;
  /** A tracked file still carries conflict markers. */
  conflictMarkers: boolean;
  /** `baseRef` is an ancestor of HEAD, so the checkout is built on it. Only with `baseRef`. */
  onBase?: boolean;
  /** Commits HEAD has beyond `baseRef`. Only with `baseRef`. */
  commitsAhead?: number;
};

/**
 * Zod schema for `GitCheckoutStateResult`.
 *
 * @public
 */
export const GitCheckoutStateResultSchema = z.strictObject({
  branch: z.string(),
  rebaseInProgress: z.boolean(),
  dirty: z.boolean(),
  conflictMarkers: z.boolean(),
  onBase: z.boolean().optional(),
  commitsAhead: z.number().optional(),
});

/**
 * Tool that reads what state a checkout is in before something is done to it.
 *
 * `git_status` answers what changed; this answers whether the checkout is in a fit state to act on: is a
 * rebase still open, is the tree clean, did anything keep its conflict markers, and — with a `baseRef` — is
 * the work built on that base and how far beyond it. It is the read to make after handing a checkout to
 * someone else, where what you need is not a diff but a verdict.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_checkout_state',
  description:
    'Reports whether a checkout is fit to act on: rebase in progress, dirty tree, leftover conflict markers, ' +
    'and with baseRef whether HEAD is built on it and how many commits beyond it.',
  schema: z
    .object({
      baseRef: z.string().optional().describe('Measure the checkout against this ref, e.g. origin/main.'),
      dir: GitDirArgSchema,
    })
    .strict(),
  configSchema: GitTargetConfigSchema,
  resultSchema: GitCheckoutStateResultSchema,
  effects: 'none',
})
export class GitCheckoutStateTool extends BaseTool<GitCheckoutStateArgs, GitTargetConfig, GitCheckoutStateResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(
    args: GitCheckoutStateArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<GitTargetConfig>,
  ): Promise<ToolEnvelope<GitCheckoutStateResult>> {
    const agentUrl = await targetAgentUrl(this.env, options);
    const exec = (command: string) => gitExec(this.remote, agentUrl, command, args.dir);
    const run = (command: string) => gitRun(this.remote, agentUrl, command, args.dir);

    // Git keeps a rebase's state in one of two directories, depending on which backend ran it.
    const rebaseInProgress =
      (
        await exec(
          'test -d "$(git rev-parse --git-path rebase-merge)" -o -d "$(git rev-parse --git-path rebase-apply)"',
        )
      ).exitCode === 0;
    const dirty = (await run('git status --porcelain')).length > 0;
    // `diff --check` exits non-zero when a tracked file has a conflict marker or whitespace error.
    const conflictMarkers = (await exec('git diff --check HEAD')).exitCode !== 0;
    const branch = await run('git rev-parse --abbrev-ref HEAD');

    if (!args.baseRef) {
      return { data: { branch, rebaseInProgress, dirty, conflictMarkers } };
    }

    const baseRef = safeRef(args.baseRef);
    const onBase = (await exec(`git merge-base --is-ancestor ${baseRef} HEAD`)).exitCode === 0;
    const commitsAhead = Number((await run(`git rev-list --count ${baseRef}..HEAD`)) || '0');

    return { data: { branch, rebaseInProgress, dirty, conflictMarkers, onBase, commitsAhead } };
  }
}
