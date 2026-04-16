import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitLogArgs = {
  limit?: number;
};

@Tool({
  schema: z
    .object({
      limit: z.number().optional().default(20).describe('Maximum number of log entries to return'),
    })
    .strict(),
  uiConfig: {
    description: 'Shows the git commit log for the workspace repository.',
  },
})
export class GitLogTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitLogArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitLog(agentUrl, args.limit);
    return { data: result };
  }
}
