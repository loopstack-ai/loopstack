import { Inject, type Type } from '@nestjs/common';
import {
  BaseWorkflow,
  Guard,
  QueueResult,
  RunOptions,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { WorkflowRegistryService } from '../../workflow-processor/services/workflow-registry.service.js';
import {
  type FanOutArgs,
  FanOutArgsSchema,
  type FanOutInput,
  type FanOutItemInput,
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
export class FanOutWorkflow extends BaseWorkflow<FanOutInput, FanOutState> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly registry: WorkflowRegistryService,
  ) {
    super();
  }

  /**
   * Override `run()` to convert `items` (array OR record) into the persisted ordered-entries
   * shape and reject duplicate keys before queuing.
   */
  async run(args?: FanOutInput, options?: RunOptions): Promise<QueueResult> {
    if (!args) {
      throw new Error('FanOutWorkflow requires { items } — see the FanOutInput type.');
    }
    const { entries, itemsWereArray } = this.normalizeItems(args.items);
    const normalized: FanOutArgs = {
      entries,
      itemsWereArray,
      mode: args.mode ?? 'all',
    };
    return super.run(normalized as unknown as FanOutInput, options);
  }

  @Transition({ to: 'awaiting' })
  async start(state: FanOutState, ctx: RunContext): Promise<FanOutState> {
    const args = ctx.args as FanOutArgs;
    const itemKeys = args.entries.map(([key]) => key);

    // Resolve all workflow classes up front so a bad name fails before any queueing.
    const resolved = args.entries.map(([key, item]) => ({
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

    return {
      pendingCount: itemKeys.length,
      results: {},
      itemKeys,
      itemsWereArray: args.itemsWereArray,
      mode: args.mode,
    };
  }

  @Transition({ from: 'awaiting', to: 'awaiting', wait: true })
  async onChildComplete(state: FanOutState, payload: Record<string, unknown>, ctx: RunContext): Promise<FanOutState> {
    const subscriberMetadata = payload._subscriberMetadata as { key?: string } | undefined;
    const key = subscriberMetadata?.key;
    if (!key) {
      throw new Error('FanOut child completion missing correlation key in _subscriberMetadata.');
    }

    const status = (payload.status as FanOutResultEntry['status']) ?? 'failed';
    const isError = status === 'failed' || status === 'canceled';

    const entry: FanOutResultEntry = isError
      ? { status, error: status === 'canceled' ? 'Sibling failure canceled this child.' : `Child workflow ${status}.` }
      : { status, data: payload.data };

    const newResults = { ...state.results, [key]: entry };
    const newPending = state.pendingCount - 1;

    if (state.mode === 'all' && status === 'failed' && ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }

    return { ...state, pendingCount: newPending, results: newResults };
  }

  @Transition({ from: 'awaiting', to: 'end' })
  @Guard('allComplete')
  async done(state: FanOutState): Promise<FanOutResult> {
    return this.buildResult(state);
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

  private normalizeItems(items: FanOutInput['items']): { entries: FanOutArgs['entries']; itemsWereArray: boolean } {
    const itemsWereArray = Array.isArray(items);
    const rawEntries: Array<[string, FanOutItemInput]> = itemsWereArray
      ? items.map((item, index) => [item.label ?? String(index), item])
      : Object.entries(items);

    const seen = new Set<string>();
    const entries: FanOutArgs['entries'] = rawEntries.map(([key, item]) => {
      if (seen.has(key)) {
        throw new Error(`FanOut item key "${key}" is duplicated. Keys must be unique.`);
      }
      seen.add(key);
      return [key, item];
    });

    return { entries, itemsWereArray };
  }
}
