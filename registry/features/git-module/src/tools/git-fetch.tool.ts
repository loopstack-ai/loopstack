import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitFetchTool`.
 *
 * @public
 */
export type GitFetchArgs = {
  remote?: string;
  token?: string;
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
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
})
export class GitFetchTool extends BaseTool<GitFetchArgs, object, GitFetchResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitFetchArgs): Promise<ToolEnvelope<GitFetchResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitFetch(agentUrl, args.remote, args.token);
    return { data: result };
  }
}
