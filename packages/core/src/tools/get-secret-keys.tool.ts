import { Inject } from '@nestjs/common';
import { RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { SecretService } from '../persistence';

@Tool({
  config: {
    description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
  },
})
export class GetSecretKeysTool implements ToolInterface {
  @Inject() private secretService: SecretService;

  async execute(_args: undefined, context: RunContext): Promise<ToolResult> {
    const secrets = await this.secretService.findAllByWorkspace(context.workspaceId);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
