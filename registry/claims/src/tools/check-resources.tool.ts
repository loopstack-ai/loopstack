import { Inject } from '@nestjs/common';
import { BaseTool, Tool, type ToolEnvelope } from '@loopstack/common';
import type { ResourceState } from '../interfaces/index.js';
import { type CheckResourcesArgs, CheckResourcesArgsSchema } from '../schemas/index.js';
import { ResourceClaimService } from '../services/index.js';

/**
 * Reports what holds each resource and how much of it is left.
 *
 * Advisory: between this and a claim, anything may change. It is what a decision is made *from*; the claim is
 * what makes the decision real.
 *
 * @providedBy ClaimsModule
 * @public
 */
@Tool({
  name: 'check_resources',
  description: 'Reports the holders and free capacity of each named resource.',
  schema: CheckResourcesArgsSchema,
  effects: 'none',
})
export class CheckResourcesTool extends BaseTool<CheckResourcesArgs, object, ResourceState[]> {
  @Inject() private claims: ResourceClaimService;

  protected async handle(args: CheckResourcesArgs): Promise<ToolEnvelope<ResourceState[]>> {
    const data = await this.claims.availability(args.keys);
    return { data };
  }
}
