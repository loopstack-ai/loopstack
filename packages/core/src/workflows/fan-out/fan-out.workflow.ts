import { Inject, type Type } from '@nestjs/common';
import {
  BaseWorkflow,
  Guard,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
import { WorkflowRegistryService } from '../../workflow-processor/services/workflow-registry.service.js';
import {
  type FanOutArgs,
  FanOutArgsSchema,
  type FanOutInput,
  type FanOutMode,
  type FanOutResult,
  type FanOutResultEntry,
} from './fan-out.types.js';

interface FanOutState {
  pendingCount: number;
  results: Record<string, FanOutResultEntry>;
  itemKeys: string[];
  itemsWereArray: boolean;
  mode: FanOutMode;
}

/**
 * Launches N sub-workflows in parallel, awaits all of them, and fires a single
 * aggregated callback to the parent.
 *
 * Sub-workflows are referenced by their canonical name (string) — set via
 * `@Workflow({ name })` or auto-derived from the class name (e.g. `MyWorkflow` → `'my'`).
 *
 * ```ts
 * constructor(private readonly fanOut: FanOutWorkflow) { super(); }
 *
 * @Transition({ to: 'awaiting' })
 * async start() {
 *   await this.fanOut.run({
 *     items: {
 *       fetchUser:   { workflow: 'fetch_user',   args: { id: 1 } },
 *       fetchOrders: { workflow: 'fetch_orders', args: { id: 1 } },
 *     },
 *   }, { callback: { transition: 'onAllDone' } });
 * }
 * ```
 *
 * Modes:
 * - `'all'` *(default)* — first failure cancels in-flight siblings; callback fires
 *   once every child has settled (canceled siblings also send callbacks).
 * - `'allSettled'` — every child runs to completion; callback aggregates all results.
 */
@Workflow({
  name: 'fan_out',
  title: 'Fan Out',
  description: 'Launches multiple sub-workflows in parallel and aggregates their results.',
  schema: FanOutArgsSchema,
})
export class FanOutWorkflow extends BaseWorkflow<FanOutArgs, FanOutInput> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly registry: WorkflowRegistryService,
  ) {
    super();
  }

  @Transition({ to: 'awaiting' })
  async start(state: FanOutState, ctx: RunContext<FanOutArgs>) {
    const { entries, itemsWereArray, mode } = ctx.args;
    const itemKeys = entries.map(([key]) => key);

    // Resolve all workflow classes up front so a bad name fails before any queueing.
    const resolved = entries.map(([key, item]) => ({
      key,
      item,
      workflowClass: this.resolveClass(item.workflow),
    }));

    for (const { key, item, workflowClass } of resolved) {
      await this.orchestrator.queue(workflowClass, item.args ?? {}, {
        callback: { transition: 'onChildComplete', metadata: { key } },
        show: item.show ?? 'inline',
        label: item.label,
      });
    }

    this.assignState({
      pendingCount: itemKeys.length,
      results: {},
      itemKeys,
      itemsWereArray,
      mode,
    });
  }

  @Transition({ from: 'awaiting', to: 'awaiting', wait: true })
  async onChildComplete(
    state: FanOutState,
    input: TransitionInput<unknown, { key?: string }>,
    ctx: RunContext<FanOutArgs>,
  ) {
    const key = input.meta?.key;
    if (!key) {
      throw new Error('FanOut child completion missing correlation key in TransitionInput.meta.');
    }

    const status = input.status as FanOutResultEntry['status'];
    const isError = input.hasError;

    const entry: FanOutResultEntry = isError
      ? { status, error: status === 'canceled' ? 'Sibling failure canceled this child.' : `Child workflow ${status}.` }
      : { status, data: input.data };

    const newResults = { ...state.results, [key]: entry };
    const newPending = state.pendingCount - 1;

    if (state.mode === 'all' && status === 'failed' && ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }

    this.assignState({ pendingCount: newPending, results: newResults });
  }

  @Transition({ from: 'awaiting', to: 'end' })
  @Guard('allComplete')
  done(state: FanOutState) {
    this.setResult(this.buildResult(state) as unknown as Record<string, unknown>);
  }

  private allComplete(state: FanOutState): boolean {
    return state.pendingCount === 0;
  }

  private buildResult(state: FanOutState): FanOutResult {
    const errorCount = state.itemKeys.reduce((n, k) => n + (state.results[k]?.status !== 'completed' ? 1 : 0), 0);

    if (state.itemsWereArray) {
      return {
        results: state.itemKeys.map((k) => ({ key: k, ...this.entryOrMissing(state, k) })),
        hasErrors: errorCount > 0,
        errorCount,
      };
    }

    const results: Record<string, FanOutResultEntry> = {};
    for (const k of state.itemKeys) {
      results[k] = this.entryOrMissing(state, k);
    }
    return { results, hasErrors: errorCount > 0, errorCount };
  }

  private entryOrMissing(state: FanOutState, key: string): FanOutResultEntry {
    return (
      state.results[key] ?? {
        status: 'failed',
        error: 'No callback received for this child.',
      }
    );
  }

  private resolveClass(workflowName: string): Type {
    const { instance } = this.registry.resolve(workflowName);
    return instance.constructor as Type;
  }
}
