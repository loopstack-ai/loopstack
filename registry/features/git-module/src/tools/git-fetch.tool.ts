import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitFetchArgs = {
  remote?: string;
  token?: string;
};

export type GitFetchResult = {
  success: boolean;
  output?: string;
};

@Tool({
  name: 'git_fetch',
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
  uiConfig: {
    description: 'Fetches refs and objects from a remote repository without merging.',
  },
})
export class GitFetchTool extends BaseTool<GitFetchArgs, object, GitFetchResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitFetchArgs): Promise<ToolResult<GitFetchResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitFetch(agentUrl, args.remote, args.token);
    return { data: result };
  }
}
