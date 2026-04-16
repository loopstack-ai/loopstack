import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

export type GitCheckoutArgs = {
  branch: string;
  create?: boolean;
};

@Tool({
  schema: z
    .object({
      branch: z.string().describe('Branch name to switch to'),
      create: z.boolean().optional().describe('Create the branch if it does not exist'),
    })
    .strict(),
  uiConfig: {
    description: 'Switches to a different git branch, optionally creating it.',
  },
})
export class GitCheckoutTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitCheckoutArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitCheckout(agentUrl, args.branch, args.create);
    return { data: result };
  }
}
