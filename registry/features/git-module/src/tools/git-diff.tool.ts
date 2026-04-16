import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

export type GitDiffArgs = {
  staged?: boolean;
};

@Tool({
  schema: z
    .object({
      staged: z.boolean().optional().describe('Show staged changes instead of unstaged'),
    })
    .strict(),
  uiConfig: {
    description: 'Shows changed files in the workspace. Returns file paths and their change status.',
  },
})
export class GitDiffTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitDiffArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitDiff(agentUrl, args.staged);
    return { data: result };
  }
}
