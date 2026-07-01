import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

/**
 * Result for `reset_workspace` — success flag and a status message.
 *
 * @public
 */
export type ResetWorkspaceResult = {
  success: boolean;
  message: string;
};

/**
 * Tool that resets the remote workspace to its initial state, clearing changes, temp files, database, and Redis.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Tool({
  name: 'reset_workspace',
  description: 'Resets the workspace to its initial state, clearing all changes, temp files, database, and Redis.',
})
export class ResetWorkspaceTool extends BaseTool<Record<string, never>, object, ResetWorkspaceResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(): Promise<ToolEnvelope<ResetWorkspaceResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.resetWorkspace(agentUrl);
    return { data: result };
  }
}
