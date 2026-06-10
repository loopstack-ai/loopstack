import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SecretService } from '@loopstack/secrets-module';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/index.js';

const SyncSecretsInputSchema = z.object({}).strict();

type SyncSecretsInput = z.infer<typeof SyncSecretsInputSchema>;

export type SyncSecretsResult = { success: true; count: 0; message: string } | { success: boolean; count: number };

@Tool({
  name: 'sync_secrets',
  description:
    'Syncs all workspace secrets to the remote environment as .env variables and restarts the app. ' +
    'Call this before or during app restart to ensure secrets (API keys, config values) are available. ' +
    'Returns the count of synced secrets.',
  schema: SyncSecretsInputSchema,
})
export class SyncSecretsTool extends BaseTool<SyncSecretsInput, object, SyncSecretsResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
    private readonly secretService: SecretService,
  ) {
    super();
  }

  protected async handle(_args: SyncSecretsInput, ctx: RunContext): Promise<ToolResult<SyncSecretsResult>> {
    const secrets = await this.secretService.findAllByWorkspace(ctx.workspaceId);

    if (secrets.length === 0) {
      return {
        data: { success: true, count: 0, message: 'No secrets to sync' },
      };
    }

    const agentUrl = await this.env.getAgentUrl();
    const variables = secrets.map((s) => ({ key: s.key, value: s.value }));

    const result = await this.remote.setEnvVars(agentUrl, variables);

    return {
      data: {
        success: result.success,
        count: result.count,
      },
    };
  }
}
