import { Inject } from '@nestjs/common';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { SecretService } from '../persistence';

@Tool({
  config: {
    description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
  },
})
export class GetSecretKeysTool extends BaseTool {
  @Inject() private secretService: SecretService;

  async run(_args: undefined): Promise<ToolResult> {
    const secrets = await this.secretService.findAllByWorkspace(this.context.workspaceId);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
