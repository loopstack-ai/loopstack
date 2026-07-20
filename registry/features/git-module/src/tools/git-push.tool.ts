import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitPushTool`.
 *
 * @public
 */
export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  token?: string;
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
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
})
export class GitPushTool extends BaseTool<GitPushArgs, object, GitPushResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitPushArgs): Promise<ToolEnvelope<GitPushResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitPush(agentUrl, {
      remote: args.remote,
      branch: args.branch,
      force: args.force,
      token: args.token,
    });
    return { data: result };
  }
}
