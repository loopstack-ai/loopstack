import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

@Tool({
  schema: z.object({}).strict(),
  uiConfig: {
    description:
      'Gets the git status of the workspace. Returns current branch, staged, modified, untracked, and deleted files.',
  },
})
export class GitStatusTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitStatus(agentUrl);
    return { data: result };
  }
}
