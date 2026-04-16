import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitAddArgs = {
  files: string[];
};

@Tool({
  schema: z
    .object({
      files: z.array(z.string()).describe('File paths to stage. Use ["."] to stage all changes.'),
    })
    .strict(),
  uiConfig: {
    description: 'Stages files for the next git commit.',
  },
})
export class GitAddTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitAddArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitAdd(agentUrl, args.files);
    return { data: result };
  }
}
