import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type RebuildAppResult = {
  success: boolean;
  message: string;
};

@Tool({
  name: 'rebuild_app',
  description: 'Rebuilds and restarts the app on a remote instance.',
})
export class RebuildAppTool extends BaseTool<Record<string, never>, object, RebuildAppResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(): Promise<ToolEnvelope<RebuildAppResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.rebuildApp(agentUrl);
    return { data: result };
  }
}
