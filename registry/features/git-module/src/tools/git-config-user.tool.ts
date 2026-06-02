import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitConfigUserArgs = {
  name: string;
  email: string;
};

export type GitConfigUserResult = { success: boolean };

@Tool({
  name: 'git_config_user',
  description: 'Configures git user.name and user.email for the workspace repository.',
  schema: z
    .object({
      name: z.string().describe('Git user name (user.name)'),
      email: z.string().describe('Git user email (user.email)'),
    })
    .strict(),
})
export class GitConfigUserTool extends BaseTool<GitConfigUserArgs, object, GitConfigUserResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitConfigUserArgs, ctx: LoopstackContext): Promise<ToolResult<GitConfigUserResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitConfigUser(agentUrl, args.name, args.email);
    return { data: result };
  }
}
