import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitTokenService, type GitToolConfig, GitToolConfigSchema } from '../token/index.js';
import { GitDirArgSchema } from './git-dir.schema.js';

/**
 * Args for `GitFetchTool`.
 *
 * @public
 */
export type GitFetchArgs = {
  remote?: string;
  dir?: string;
};

/**
 * Result for `GitFetchTool`.
 *
 * @public
 */
export type GitFetchResult = {
  success: boolean;
  output?: string;
};

/**
 * Zod schema for `GitFetchResult`.
 *
 * @public
 */
export const GitFetchResultSchema = z.strictObject({ success: z.boolean(), output: z.string().optional() });

/**
 * Tool that fetches refs and objects from a remote repository without merging.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_fetch',
  description: 'Fetches refs and objects from a remote repository without merging.',
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      dir: GitDirArgSchema,
    })
    .strict(),
  configSchema: GitToolConfigSchema,
  resultSchema: GitFetchResultSchema,
  effects: 'external',
})
export class GitFetchTool extends BaseTool<GitFetchArgs, GitToolConfig, GitFetchResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
    private readonly tokens: GitTokenService,
  ) {
    super();
  }

  protected async handle(
    args: GitFetchArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitFetchResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const token = await this.tokens.resolve(ctx, options);
    const result = await this.remote.gitFetch(agentUrl, { ...args, ...(token ? { token } : {}) });
    return { data: result };
  }
}
