import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteAgentClient, SandboxEnvironmentService } from '@loopstack/remote-agent-client';

export type GitFetchArgs = {
  remote?: string;
  token?: string;
};

@Tool({
  schema: z
    .object({
      remote: z.string().optional().describe('Remote name (defaults to origin)'),
      token: z.string().optional().describe('Access token for authentication'),
    })
    .strict(),
  uiConfig: {
    description: 'Fetches refs and objects from a remote repository without merging.',
  },
})
export class GitFetchTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteAgentClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(args: GitFetchArgs): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.gitFetch(agentUrl, args.remote, args.token);
    return { data: result };
  }
}
