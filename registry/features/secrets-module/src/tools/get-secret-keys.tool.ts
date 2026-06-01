import { Inject } from '@nestjs/common';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import { SecretService } from '../services/index.js';

export type GetSecretKeysResult = { key: string; hasValue: boolean }[];

@Tool({
  name: 'get_secret_keys',
  description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
})
export class GetSecretKeysTool extends BaseTool<object, object, GetSecretKeysResult> {
  @Inject() private secretService: SecretService;

  protected async handle(_args?: object): Promise<ToolResult<GetSecretKeysResult>> {
    const secrets = await this.secretService.findAllByWorkspace(this.ctx.workspaceId as string);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
