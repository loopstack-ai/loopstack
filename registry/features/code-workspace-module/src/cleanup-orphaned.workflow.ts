import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  Guard,
  MarkdownDocument,
  MessageDocument,
  Transition,
  type TransitionInput,
  Workflow,
} from '@loopstack/common';
import { ConfirmUserWorkflow } from '@loopstack/hitl';
import { CODE_WORKSPACE_OPTIONS, type ResolvedCodeWorkspaceOptions } from './code-workspace.options.js';
import { CODE_WORKSPACE_PROVISIONER, type CodeWorkspaceProvisioner } from './code-workspace.provisioner.js';
import { type OrphanPlan, WorkspaceInventoryService } from './workspace-inventory.service.js';

const InputSchema = z.object({});
type InputArgs = z.infer<typeof InputSchema>;

const ConfirmResultSchema = z.object({ confirmed: z.boolean(), markdown: z.string().optional() });

interface OrphanState {
  plan?: OrphanPlan;
  confirmed?: boolean;
}

/**
 * Reclaims everything whose owning row was deleted: whole workspace states, individual checkouts, and the
 * containers and volumes that went with them. Scans fresh, shows exactly what it would remove, and acts only
 * after confirmation. Every removal is idempotent, so a partly failed run can simply be run again.
 *
 * This is the net under the automatic release. A workspace or a run being deleted frees its state by itself
 * (see `WorkspaceCleanupListener`), but that happens in the background, in this process: a removal that
 * failed, or a process that died between the event and the removal, leaves state behind. That state has no
 * owning row, which is exactly what this finds.
 *
 * Bases are proposed only when the application declared which ones it provisions (`knownBaseKeys`). Without
 * that, no base is ever proposed — reading "none declared" as "none wanted" would delete every base on disk,
 * which is the one mistake here that cannot be undone.
 */
@Workflow({
  name: 'cleanup_orphaned',
  title: 'Clean Up Orphaned State',
  description: 'Finds state whose workspace/run was deleted and reclaims it after confirmation.',
  schema: InputSchema,
})
export class CleanupOrphanedWorkflow extends BaseWorkflow<InputArgs> {
  constructor(
    @Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner,
    private readonly inventory: WorkspaceInventoryService,
    private readonly confirmUser: ConfirmUserWorkflow,
    @Inject(CODE_WORKSPACE_OPTIONS) private readonly options: ResolvedCodeWorkspaceOptions,
  ) {
    super();
  }

  // The scan walks every state dir with `du` (slow on multi-GB checkouts) — commit a visible line first
  // in its own transition, so the user sees what is happening instead of a bare spinner.
  @Transition({ to: 'scanning' })
  async announce(): Promise<void> {
    await this.note('Scanning disk and Docker state for orphans (sizes take a moment)…');
  }

  @Transition({ from: 'scanning', to: 'scanned' })
  async scan(): Promise<void> {
    const inventory = await this.inventory.scan();
    const plan = this.inventory.orphanPlan(inventory, this.options.knownBaseKeys);
    this.assignState({ plan });
    if (plan.workspaceIds.length || plan.checkouts.length || plan.bases.length) {
      await this.confirmUser.run(
        { markdown: this.inventory.renderOrphanPlan(inventory, plan) },
        { callback: { transition: 'onConfirmed' }, show: 'inline', label: 'Confirm cleanup' },
      );
    }
  }

  // Superseded base generations need no confirmation — nothing reads them — and they accumulate with every
  // refresh whether or not a row was deleted, so they are collected on every run, this path included.
  @Transition({ from: 'scanned', to: 'end', priority: 10 })
  @Guard('nothingOrphaned')
  async nothingToDo(): Promise<void> {
    const removedGenerations = await this.collectGenerations();
    await this.documentStore.save(MarkdownDocument, {
      markdown:
        '### Clean up orphaned state\n\nNothing is orphaned — all disk and docker state belongs to live rows. ' +
        `Collected ${removedGenerations} superseded base generation(s).`,
    });
    this.setResult({
      removedWorkspaces: 0,
      removedCheckouts: 0,
      removedBases: 0,
      removedGenerations,
    } as unknown as Record<string, unknown>);
  }

  @Transition({ from: 'scanned', to: 'deciding', wait: true, schema: ConfirmResultSchema })
  async onConfirmed(_state: OrphanState, input: TransitionInput<{ confirmed: boolean }>): Promise<void> {
    this.assignState({ confirmed: input.data.confirmed });
  }

  @Transition({ from: 'deciding', to: 'end', priority: 10 })
  @Guard('declined')
  async keepEverything(): Promise<void> {
    await this.note('Nothing removed.');
    this.setResult({ removedWorkspaces: 0, removedCheckouts: 0, removedBases: 0 } as unknown as Record<
      string,
      unknown
    >);
  }

  // Commit the "Removing…" line in its own transition so it renders before the (slow) reclaim runs.
  @Transition({ from: 'deciding', to: 'removing' })
  async announceReclaim(state: OrphanState): Promise<void> {
    const plan = state.plan!;
    await this.note(
      `Removing ${plan.workspaceIds.length} workspace state(s), ${plan.checkouts.length} checkout(s) and ` +
        `${plan.bases.length} left-over base(s) — large state takes a while…`,
    );
  }

  @Transition({ from: 'removing', to: 'end' })
  async reclaim(state: OrphanState): Promise<void> {
    const plan = state.plan!;
    // Idempotent per entry; one failure doesn't stop the sweep — outcomes are reported per item.
    const failures: string[] = [];
    let removedWorkspaces = 0;
    let removedCheckouts = 0;
    for (const workspaceId of plan.workspaceIds) {
      try {
        await this.workspace.removeWorkspaceState(workspaceId);
        removedWorkspaces++;
      } catch (error) {
        failures.push(`workspace \`${workspaceId}\`: ${message(error)}`);
      }
    }
    for (const { workspaceId, workflowId } of plan.checkouts) {
      try {
        await this.workspace.removeWorkflowCheckout(workspaceId, workflowId);
        removedCheckouts++;
      } catch (error) {
        failures.push(`checkout \`${workflowId}\`: ${message(error)}`);
      }
    }
    // A base nothing provisions any more: whole, including its published generation, which is why the
    // collector below would never reach it. Refused by the provisioner if a checkout still reads it or a
    // build holds its lock — the scan said otherwise, but it ran before the removals above.
    let removedBases = 0;
    for (const baseKey of plan.bases) {
      try {
        await this.workspace.removeBase(baseKey);
        removedBases++;
      } catch (error) {
        failures.push(`base \`${baseKey}\`: ${message(error)}`);
      }
    }
    // Base generations last: a checkout removed above may have been the only thing pinning one, so
    // collecting after the sweep frees what this run just made collectable. Never touches the published
    // generation of any base, one a surviving checkout still reads, or a base being provisioned.
    let removedGenerations = 0;
    try {
      removedGenerations = await this.collectGenerations();
    } catch (error) {
      failures.push(`base generations: ${message(error)}`);
    }
    const summary = [
      `Removed ${removedWorkspaces} workspace state(s), ${removedCheckouts} checkout(s), ${removedBases} ` +
        `left-over base(s) and ${removedGenerations} superseded base generation(s).`,
    ];
    if (failures.length) summary.push('', '**Failed (re-run to retry):**', ...failures.map((f) => `- ${f}`));
    await this.documentStore.save(MarkdownDocument, {
      markdown: `### Clean up orphaned state\n\n${summary.join('\n')}`,
    });
    this.setResult({
      removedWorkspaces,
      removedCheckouts,
      removedBases,
      removedGenerations,
      ...(failures.length ? { failures } : {}),
    } as unknown as Record<string, unknown>);
  }

  nothingOrphaned(state: OrphanState): boolean {
    return !state.plan?.workspaceIds.length && !state.plan?.checkouts.length && !state.plan?.bases.length;
  }

  declined(state: OrphanState): boolean {
    return state.confirmed !== true;
  }

  private async collectGenerations(): Promise<number> {
    return (await this.workspace.collectBaseGenerations()).length;
  }

  private note(text: string): Promise<unknown> {
    return this.documentStore.save(MessageDocument, { role: 'system', text });
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
