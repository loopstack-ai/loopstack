import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitConfigUserArgs = {
  name: string;
  email: string;
};

@Tool({
  schema: z
    .object({
      name: z.string().describe('Git user name (user.name)'),
      email: z.string().describe('Git user email (user.email)'),
    })
    .strict(),
  uiConfig: {
    description: 'Configures git user.name and user.email for the workspace repository.',
  },
})
export class GitConfigUserTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitConfigUserArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitConfigUser(agentUrl, args.name, args.email);
    return { data: result };
  }
}
