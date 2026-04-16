import { Inject } from '@nestjs/common';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';
import { SandboxEnvironmentService } from '../services/sandbox-environment.service';

@Tool({
  uiConfig: {
    description: 'Rebuilds and restarts the app on a remote instance.',
  },
})
export class RebuildAppTool extends BaseTool {
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(_args: Record<string, never>): Promise<ToolResult> {
    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const result = await this.remoteAgentClient.rebuildApp(agentUrl);
    return { data: result };
  }
}
