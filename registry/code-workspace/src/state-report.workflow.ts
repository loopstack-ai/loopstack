import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, MarkdownDocument, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { CODE_WORKSPACE_OPTIONS, type ResolvedCodeWorkspaceOptions } from './code-workspace.options.js';
import { WorkspaceInventoryService } from './workspace-inventory.service.js';

const InputSchema = z.object({});
type InputArgs = z.infer<typeof InputSchema>;

/**
 * Read-only inventory: every workspace's state directory with its sizes and checkouts, every container and
 * volume this module created, and the shared bases and caches — each joined against the workflow and
 * workspace tables, with orphans (the owning row deleted) flagged.
 *
 * This is what to read before deleting anything: it is the only view that shows state which is **not** an
 * orphan — "this workspace holds 12 GB in three checkouts" — which is the figure you decide against, since
 * deleting a workspace is what reclaims its disk. The sweep beside it shows only what it would remove.
 *
 * Run it any time; nothing is modified.
 */
@Workflow({
  name: 'workspace_state_report',
  title: 'State Report',
  description: 'Lists every workspace’s disk and docker state with sizes, and flags orphaned entries. Read-only.',
  schema: InputSchema,
})
export class StateReportWorkflow extends BaseWorkflow<InputArgs> {
  constructor(
    private readonly inventory: WorkspaceInventoryService,
    @Inject(CODE_WORKSPACE_OPTIONS) private readonly options: ResolvedCodeWorkspaceOptions,
  ) {
    super();
  }

  // The scan walks every state dir with `du` (slow on multi-GB checkouts) — commit a visible line first
  // in its own transition, so the user sees what is happening instead of a bare spinner.
  @Transition({ to: 'scanning' })
  async announce(): Promise<void> {
    await this.documentStore.save(MessageDocument, {
      role: 'system',
      text: 'Scanning disk and Docker state (sizes take a moment)…',
    });
  }

  @Transition({ from: 'scanning', to: 'end' })
  async report(): Promise<void> {
    const inventory = await this.inventory.scan();
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.inventory.renderInventory(inventory, this.options.knownBaseKeys),
    });
    const plan = this.inventory.orphanPlan(inventory, this.options.knownBaseKeys);
    this.setResult({
      workspaces: inventory.workspaces.length,
      containers: inventory.containers.length,
      volumes: inventory.volumes.length,
      orphanedWorkspaces: plan.workspaceIds.length,
      orphanedCheckouts: plan.checkouts.length,
      orphanedBases: plan.bases.length,
    } as unknown as Record<string, unknown>);
  }
}
