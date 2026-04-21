import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

@Tool({
  schema: z.object({}).strict(),
  uiConfig: {
    description: 'Prunes worktree administrative files for worktrees whose directories no longer exist.',
  },
})
export class GitWorktreePruneTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitWorktreePrune(agentUrl);
    return { data: result };
  }
}
