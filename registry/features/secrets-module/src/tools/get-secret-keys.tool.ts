import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SecretService } from '../services/index.js';

/**
 * Result for `get_secret_keys` — one entry per available key with a `hasValue` flag (never the value) and a
 * `global` flag marking keys that resolve from the global fallback rather than a workspace secret.
 *
 * @public
 */
export type GetSecretKeysResult = { key: string; hasValue: boolean; global: boolean }[];

/**
 * Zod schema for {@link GetSecretKeysResult} — the `resultSchema` of `get_secret_keys`.
 *
 * @public
 */
export const GetSecretKeysResultSchema = z.array(
  z.strictObject({
    key: z.string(),
    hasValue: z.boolean(),
    global: z.boolean(),
  }),
);

/**
 * Tool that returns the secret keys available in the current workspace without exposing their values.
 *
 * @providedBy SecretsModule
 * @public
 */
@Tool({
  name: 'get_secret_keys',
  description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
  resultSchema: GetSecretKeysResultSchema,
  effects: 'none',
})
export class GetSecretKeysTool extends BaseTool<object, object, GetSecretKeysResult> {
  @Inject() private secretService: SecretService;

  protected async handle(_args: object | undefined, ctx: RunContext): Promise<ToolEnvelope<GetSecretKeysResult>> {
    // Resolve workspace secrets plus any global fallback keys, so callers (e.g. required-secret checks) see
    // a globally-available key as present.
    const data = await this.secretService.resolveKeys(ctx.workspaceId as string);
    return { data };
  }
}
