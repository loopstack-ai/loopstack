import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitRemoteConfigureArgs = {
  url: string;
};

@Tool({
  schema: z
    .object({
      url: z.string().describe('Remote repository URL (HTTPS)'),
    })
    .strict(),
  uiConfig: {
    description: 'Configures a git remote. Adds the remote if not present, or updates its URL.',
  },
})
export class GitRemoteConfigureTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitRemoteConfigureArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitConfigureRemote(agentUrl, args.url);
    return { data: result };
  }
}
