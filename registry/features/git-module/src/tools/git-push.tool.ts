import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  token?: string;
};

export type GitPushResult = {
  success: boolean;
  output?: string;
};

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

  protected async handle(args: GitPushArgs, ctx: LoopstackContext): Promise<ToolResult<GitPushResult>> {
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
