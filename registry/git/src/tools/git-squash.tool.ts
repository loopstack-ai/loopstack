import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitDirArgSchema } from './git-dir.schema.js';
import {
  type GitTargetConfig,
  GitTargetConfigSchema,
  gitRun,
  safeRef,
  shellQuote,
  targetAgentUrl,
} from './git-exec.js';

/**
 * Args for `GitSquashTool`: the `baseRef` the branch grew from and the `message` the one commit carries.
 *
 * @public
 */
export type GitSquashArgs = {
  baseRef: string;
  message: string;
  skipHooks?: boolean;
  dir?: string;
};

/**
 * Result for `GitSquashTool`: how many commits were squashed, and the message of the commit they became.
 *
 * @public
 */
export type GitSquashResult = {
  commits: number;
  message: string;
};

/**
 * Zod schema for `GitSquashResult`.
 *
 * @public
 */
export const GitSquashResultSchema = z.strictObject({ commits: z.number(), message: z.string() });

/**
 * Tool that replaces everything the branch added since `baseRef` with a single commit.
 *
 * The commits are reset into the index and committed again, so the tree is untouched and only the history
 * changes. The commit is made under the repository's configured identity — set it with `git_config_user`
 * first — and the message is taken verbatim, so a trailer such as `Closes #12` survives. A branch whose net
 * change is nothing still becomes a commit, which keeps "the branch landed" true either way.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_squash',
  description:
    'Replaces every commit the branch added since baseRef with one commit carrying the given message. ' +
    'Returns how many commits were squashed.',
  schema: z
    .object({
      baseRef: z.string().describe('The ref the branch grew from, e.g. origin/main.'),
      message: z.string().describe('The message of the single commit; taken verbatim, trailers included.'),
      skipHooks: z.boolean().optional().describe("Do not run the repository's commit hooks."),
      dir: GitDirArgSchema,
    })
    .strict(),
  configSchema: GitTargetConfigSchema,
  resultSchema: GitSquashResultSchema,
  effects: 'external',
})
export class GitSquashTool extends BaseTool<GitSquashArgs, GitTargetConfig, GitSquashResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(
    args: GitSquashArgs,
    _ctx: RunContext,
    options?: ToolCallOptions<GitTargetConfig>,
  ): Promise<ToolEnvelope<GitSquashResult>> {
    const agentUrl = await targetAgentUrl(this.env, options);
    const run = (command: string) => gitRun(this.remote, agentUrl, command, args.dir);

    const baseRef = safeRef(args.baseRef);
    const mergeBase = await run(`git merge-base ${baseRef} HEAD`);
    const commits = Number((await run(`git rev-list --count ${safeRef(mergeBase)}..HEAD`)) || '0');

    await run(`git reset -q --soft ${safeRef(mergeBase)}`);
    const hooks = args.skipHooks ? '-c core.hooksPath=/dev/null ' : '';
    await run(`git ${hooks}commit -q --allow-empty --cleanup=verbatim -m ${shellQuote(args.message)}`);

    return { data: { commits, message: args.message } };
  }
}
