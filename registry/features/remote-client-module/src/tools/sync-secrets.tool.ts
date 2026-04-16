import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { SecretService } from '@loopstack/secrets-module';
import { RemoteClient } from '../services';
import { SandboxEnvironmentService } from '../services';

const SyncSecretsInputSchema = z.object({}).strict();

type SyncSecretsInput = z.infer<typeof SyncSecretsInputSchema>;

@Tool({
  schema: SyncSecretsInputSchema,
  uiConfig: {
    description:
      'Syncs all workspace secrets to the remote environment as .env variables and restarts the app. ' +
      'Call this before or during app restart to ensure secrets (API keys, config values) are available. ' +
      'Returns the count of synced secrets.',
  },
})
export class SyncSecretsTool extends BaseTool {
  @Inject() private secretService: SecretService;
  @Inject() private remoteAgentClient: RemoteClient;
  @Inject() private sandboxEnvironmentService: SandboxEnvironmentService;

  async call(_args: SyncSecretsInput): Promise<ToolResult> {
    const secrets = await this.secretService.findAllByWorkspace(this.ctx.context.workspaceId);

    if (secrets.length === 0) {
      return {
        data: { success: true, count: 0, message: 'No secrets to sync' },
      };
    }

    const agentUrl = this.sandboxEnvironmentService.getAgentUrl(this.ctx.context);
    const variables = secrets.map((s) => ({ key: s.key, value: s.value }));

    const result = await this.remoteAgentClient.setEnvVars(agentUrl, variables);

    return {
      data: {
        success: result.success,
        count: result.count,
      },
    };
  }
}
