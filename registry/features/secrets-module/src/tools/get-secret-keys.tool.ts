import { Inject } from '@nestjs/common';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SecretService } from '../services/index.js';

/**
 * Result for `get_secret_keys` — one entry per secret with its `key` and a `hasValue` flag, never the value.
 *
 * @public
 */
export type GetSecretKeysResult = { key: string; hasValue: boolean }[];

/**
 * Tool that returns the secret keys available in the current workspace without exposing their values.
 *
 * @providedBy SecretsModule
 * @public
 */
@Tool({
  name: 'get_secret_keys',
  description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
})
export class GetSecretKeysTool extends BaseTool<object, object, GetSecretKeysResult> {
  @Inject() private secretService: SecretService;

  protected async handle(_args: object | undefined, ctx: RunContext): Promise<ToolEnvelope<GetSecretKeysResult>> {
    const secrets = await this.secretService.findAllByWorkspace(ctx.workspaceId as string);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
