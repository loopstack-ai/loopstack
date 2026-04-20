import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

@Tool({
  schema: z.object({}).strict(),
  uiConfig: {
    description:
      'Lists all git worktrees attached to the repository. Each entry includes path, HEAD commit, branch, and flags (bare, detached, locked, prunable).',
  },
})
export class GitWorktreeListTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitWorktreeList(agentUrl);
    return { data: result };
  }
}
