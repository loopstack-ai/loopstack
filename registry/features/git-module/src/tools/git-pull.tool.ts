import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitPullTool`.
 *
 * @public
 */
export type GitPullArgs = {
  remote?: string;
  branch?: string;
  token?: string;
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
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
  resultSchema: GitPullResultSchema,
  effects: 'external',
})
export class GitPullTool extends BaseTool<GitPullArgs, object, GitPullResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitPullArgs): Promise<ToolEnvelope<GitPullResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitPull(agentUrl, {
      remote: args.remote,
      branch: args.branch,
      token: args.token,
    });
    return { data: result };
  }
}
