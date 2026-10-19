import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitTokenService, type GitToolConfig, GitToolConfigSchema } from '../token/index.js';
import { GitDirArgSchema } from './git-dir.schema.js';

/**
 * Args for `GitPullTool`.
 *
 * @public
 */
export type GitPullArgs = {
  remote?: string;
  branch?: string;
  dir?: string;
};

/**
 * Result for `GitPullTool`.
 *
 * @public
 */
export type GitPullResult = {
  success: boolean;
  output?: string;
};

/**
 * Zod schema for `GitPullResult`.
 *
 * @public
 */
export const GitPullResultSchema = z.strictObject({ success: z.boolean(), output: z.string().optional() });

/**
 * Tool that pulls changes from a remote repository.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_pull',
  description: 'Pulls changes from a remote repository.',
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      branch: z.string().optional().describe('Branch to pull'),
      dir: GitDirArgSchema,
    })
    .strict(),
  configSchema: GitToolConfigSchema,
  resultSchema: GitPullResultSchema,
  effects: 'external',
})
export class GitPullTool extends BaseTool<GitPullArgs, GitToolConfig, GitPullResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
    private readonly tokens: GitTokenService,
  ) {
    super();
  }

  protected async handle(
    args: GitPullArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitPullResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const token = await this.tokens.resolve(ctx, options);
    const result = await this.remote.gitPull(agentUrl, { ...args, ...(token ? { token } : {}) });
    return { data: result };
  }
}
