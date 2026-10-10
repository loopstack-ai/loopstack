import { Inject } from '@nestjs/common';
import { BaseTool, Tool, type ToolEnvelope } from '@loopstack/common';
import { type ReleaseResourceArgs, ReleaseResourceArgsSchema } from '../schemas/index.js';
import { ResourceClaimService } from '../services/index.js';

/**
 * Releases claims early, by id, by the run they are scoped to, or by workspace.
 *
 * Early release is ordinary — the caller need not be the run that claimed. What a scope decides is only when
 * a claim is released *automatically*.
 *
 * @providedBy ClaimsModule
 * @public
 */
@Tool({
  name: 'release_resource',
  description: 'Releases claims by id, by the run they are scoped to, or by workspace.',
  schema: ReleaseResourceArgsSchema,
  effects: 'external',
})
export class ReleaseResourceTool extends BaseTool<ReleaseResourceArgs, object, { released: number }> {
  @Inject() private claims: ResourceClaimService;

  protected async handle(args: ReleaseResourceArgs): Promise<ToolEnvelope<{ released: number }>> {
    const released = await this.claims.release(args);
    return { data: { released } };
  }
}
