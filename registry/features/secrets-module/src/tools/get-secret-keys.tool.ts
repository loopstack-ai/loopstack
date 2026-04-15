import { Inject } from '@nestjs/common';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { ExecutionScope } from '@loopstack/core';
import { SecretService } from '../services';

@Tool({
  uiConfig: {
    description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
  },
})
export class GetSecretKeysTool extends BaseTool {
  @Inject() private secretService: SecretService;
  @Inject() private executionScope: ExecutionScope;

  async call(_args: object): Promise<ToolResult> {
    const ctx = this.executionScope.get();
    const secrets = await this.secretService.findAllByWorkspace(ctx.getContext().workspaceId);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
