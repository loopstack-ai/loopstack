import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitCommitArgs = {
  message: string;
};

@Tool({
  schema: z
    .object({
      message: z.string().describe('The commit message'),
    })
    .strict(),
  uiConfig: {
    description: 'Creates a git commit with the currently staged changes.',
  },
})
export class GitCommitTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitCommitArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitCommit(agentUrl, args.message);
    return { data: result };
  }
}
