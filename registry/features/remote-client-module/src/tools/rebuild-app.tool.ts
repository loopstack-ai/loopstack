import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

/**
 * Result for `rebuild_app` — success flag and a status message.
 *
 * @public
 */
export type RebuildAppResult = {
  success: boolean;
  message: string;
};

/**
 * Zod schema for {@link RebuildAppResult}.
 *
 * @public
 */
export const RebuildAppResultSchema = z.strictObject({
  success: z.boolean(),
  message: z.string(),
});

/**
 * Tool that rebuilds and restarts the app on the remote instance.
 *
 * @providedBy RemoteClientModule
 * @public
 */
@Tool({
  name: 'rebuild_app',
  description: 'Rebuilds and restarts the app on a remote instance.',
  resultSchema: RebuildAppResultSchema,
  effects: 'external',
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
