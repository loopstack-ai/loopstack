import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

export type GitPushArgs = {
  remote?: string;
  branch?: string;
  force?: boolean;
  token?: string;
};

@Tool({
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      branch: z.string().optional().describe('Branch to push'),
      force: z.boolean().optional().describe('Force push'),
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
  uiConfig: {
    description: 'Pushes commits to a remote repository.',
  },
})
export class GitPushTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitPushArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitPush(agentUrl, {
      remote: args.remote,
      branch: args.branch,
      force: args.force,
      token: args.token,
    });
    return { data: result };
  }
}
