import { Inject } from '@nestjs/common';
import { BaseTool, type RunContext, Tool, type ToolEnvelope } from '@loopstack/common';
import type { ClaimResult } from '../interfaces/index.js';
import { type ClaimResourceArgs, ClaimResourceArgsSchema } from '../schemas/index.js';
import { ResourceClaimService } from '../services/index.js';

/**
 * Takes every named resource or none of them, and never waits.
 *
 * Host-side only. A claim decides what may run beside what, which is not an agent's decision — do not expose
 * this to one.
 *
 * @providedBy ClaimsModule
 * @public
 */
@Tool({
  name: 'claim_resource',
  description: 'Claims resources for a run or a workspace. Takes all of them or none, and never waits.',
  schema: ClaimResourceArgsSchema,
  effects: 'external',
})
export class ClaimResourceTool extends BaseTool<ClaimResourceArgs, object, ClaimResult> {
  @Inject() private claims: ResourceClaimService;

  protected async handle(args: ClaimResourceArgs, ctx: RunContext): Promise<ToolEnvelope<ClaimResult>> {
    const data = await this.claims.claim({
      resources: args.resources,
      claimedByWorkflowId: ctx.workflowId,
      ...(args.label ? { label: args.label } : {}),
    });
    return { data };
  }
}
