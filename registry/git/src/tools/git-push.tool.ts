import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext, ToolCallOptions } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GitTokenService, type GitToolConfig, GitToolConfigSchema } from '../token/index.js';
import { GitDirArgSchema } from './git-dir.schema.js';

/**
 * Args for `GitPushTool`.
 *
 * @public
 */
export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  dir?: string;
};

/**
 * Result for `GitPushTool`.
 *
 * @public
 */
export type GitPushResult = {
  success: boolean;
  output?: string;
};

/**
 * Zod schema for `GitPushResult`.
 *
 * @public
 */
export const GitPushResultSchema = z.strictObject({ success: z.boolean(), output: z.string().optional() });

/**
 * Tool that pushes commits to a remote repository.
 *
 * @providedBy GitModule
 * @public
 */
@Tool({
  name: 'git_push',
  description: 'Pushes commits to a remote repository.',
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      branch: z.string().optional().describe('Branch to push'),
      force: z.boolean().optional().describe('Force push'),
      dir: GitDirArgSchema,
    })
    .strict(),
  configSchema: GitToolConfigSchema,
  resultSchema: GitPushResultSchema,
  effects: 'external',
})
export class GitPushTool extends BaseTool<GitPushArgs, GitToolConfig, GitPushResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
    private readonly tokens: GitTokenService,
  ) {
    super();
  }

  protected async handle(
    args: GitPushArgs,
    ctx: RunContext,
    options?: ToolCallOptions<GitToolConfig>,
  ): Promise<ToolEnvelope<GitPushResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const token = await this.tokens.resolve(ctx, options);
    const result = await this.remote.gitPush(agentUrl, { ...args, ...(token ? { token } : {}) });
    return { data: result };
  }
}
