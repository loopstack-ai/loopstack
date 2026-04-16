import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitPullArgs = {
  remote?: string;
  branch?: string;
  token?: string;
};

@Tool({
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      branch: z.string().optional().describe('Branch to pull'),
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
  uiConfig: {
    description: 'Pulls changes from a remote repository.',
  },
})
export class GitPullTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitPullArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitPull(agentUrl, {
      remote: args.remote,
      branch: args.branch,
      token: args.token,
    });
    return { data: result };
  }
}
