import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WORKFLOW_SETTLED, type WorkflowSettledEvent } from '@loopstack/core';
import { ResourceClaimService } from './resource-claim.service.js';

/**
 * Releases claims when what they are scoped to ends.
 *
 * This is tidiness, not correctness: every read already ignores a claim whose scope target has settled or
 * gone (see {@link ResourceClaimService}), so a lost event costs nothing but a row that reads as live until
 * someone looks at it. Which is why a failure here is logged and never thrown — it is on the path of a run
 * that has already finished, and failing it would achieve nothing.
 */
@Injectable()
export class ClaimLifecycleListener {
  private readonly logger = new Logger(ClaimLifecycleListener.name);

  constructor(private readonly claims: ResourceClaimService) {}

  @OnEvent(WORKFLOW_SETTLED)
  async onWorkflowSettled(event: WorkflowSettledEvent): Promise<void> {
    await this.releaseQuietly({ scopeWorkflowId: event.id }, `settled run ${event.id}`);
  }

  /**
   * A deleted run releases the claims **scoped to it** — not the ones it merely took. A run that claimed on
   * another's behalf, or took a workspace-scoped unit, leaves those alone: their lifetime was declared to be
   * something else.
   */
  @OnEvent('workflow.deleted')
  async onWorkflowDeleted(payload: { id: string }): Promise<void> {
    await this.releaseQuietly({ scopeWorkflowId: payload.id }, `deleted run ${payload.id}`);
  }

  /** A deleted workspace releases every claim of that workspace, of either scope. */
  @OnEvent('workspace.deleted')
  async onWorkspaceDeleted(payload: { id: string }): Promise<void> {
    await this.releaseQuietly({ workspaceId: payload.id }, `deleted workspace ${payload.id}`);
  }

  private async releaseQuietly(target: { scopeWorkflowId?: string; workspaceId?: string }, what: string) {
    try {
      const released = await this.claims.release(target);
      if (released) this.logger.log(`Released ${released} claim(s) of ${what}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not release the claims of ${what}: ${message} — they reconcile as free anyway.`);
    }
  }
}
