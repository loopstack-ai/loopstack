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
import type { RunContext, TransitionInput } from '@loopstack/common';
import { WorkflowRegistryService } from '../../workflow-processor/services/workflow-registry.service.js';
import {
  type SequenceArgs,
  SequenceArgsSchema,
  type SequenceInput,
  type SequenceItemInput,
  type SequenceMode,
  type SequenceResult,
  type SequenceResultEntry,
} from './sequence.types.js';

interface SequenceState {
  currentIndex: number;
  results: Record<string, SequenceResultEntry>;
  itemKeys: string[];
  itemsWereArray: boolean;
  mode: SequenceMode;
  /** Flag set when mode 'all' encounters a failure — remaining items are recorded as 'skipped'. */
  aborted: boolean;
}

/**
 * Runs N sub-workflows one at a time, awaits each, and fires a single aggregated
 * callback to the parent.
 *
 * Sub-workflows are referenced by their canonical name (string) — set via
 * `@Workflow({ name })` or auto-derived from the class name (e.g. `MyWorkflow` → `'my'`).
 *
 * ```ts
 * constructor(private readonly sequence: SequenceWorkflow) { super(); }
 *
 * @Transition({ to: 'awaiting' })
 * async start() {
 *   await this.sequence.run({
 *     items: [
 *       { workflow: 'step_a', args: {...} },
 *       { workflow: 'step_b', args: {...} },
 *     ],
 *   }, { callback: { transition: 'onComplete' } });
 * }
 * ```
 *
 * Modes:
 * - `'all'` *(default)* — first failure aborts the sequence; remaining items are
 *   marked as `'skipped'` in the result.
 * - `'allSettled'` — every item runs regardless of prior failures.
 */
@Workflow({
  name: 'sequence',
  title: 'Sequence',
  description: 'Runs multiple sub-workflows one after another and aggregates their results.',
  schema: SequenceArgsSchema,
})
// The class is typed with SequenceInput (the friendly external API), but at runtime ctx.args
// is the normalized SequenceArgs (entries-array). The `as unknown as SequenceArgs` casts below
// bridge that gap. Single-generic BaseWorkflow can't model Input ≠ Args; revisit if we add
// a second generic later.
export class SequenceWorkflow extends BaseWorkflow<SequenceInput> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly registry: WorkflowRegistryService,
  ) {
    super();
  }

  async run(args?: SequenceInput, options?: RunOptions): Promise<QueueResult> {
    if (!args) {
      throw new Error('SequenceWorkflow requires { items } — see the SequenceInput type.');
    }
    const { entries, itemsWereArray } = this.normalizeItems(args.items);
    const normalized: SequenceArgs = {
      entries,
      itemsWereArray,
      mode: args.mode ?? 'all',
    };
    return super.run(normalized as unknown as SequenceInput, options);
  }

  @Transition({ to: 'awaiting' })
  async start(state: SequenceState, ctx: RunContext<SequenceInput>) {
    const args = ctx.args as unknown as SequenceArgs;
    const itemKeys = args.entries.map(([key]) => key);

    // Resolve every workflow class up front so a bad name fails the sequence immediately.
    args.entries.forEach(([, item]) => this.resolveClass(item.workflow));

    if (itemKeys.length > 0) {
      await this.queueAt(args, 0);
    }

    this.assignState({
      currentIndex: 0,
      results: {},
      itemKeys,
      itemsWereArray: args.itemsWereArray,
      mode: args.mode,
      aborted: false,
    });
  }

  @Transition({ from: 'awaiting', to: 'awaiting', wait: true })
  async onChildComplete(state: SequenceState, input: TransitionInput, ctx: RunContext<SequenceInput>) {
    const args = ctx.args as unknown as SequenceArgs;
    const key = state.itemKeys[state.currentIndex];
    if (!key) {
      throw new Error('Sequence received a child callback with no matching active item.');
    }

    const status = input.status as SequenceResultEntry['status'];
    const isError = input.hasError;

    const entry: SequenceResultEntry = isError
      ? { status, error: `Child workflow ${status}.` }
      : { status, data: input.data };

    const newResults = { ...state.results, [key]: entry };
    const nextIndex = state.currentIndex + 1;
    const shouldContinue = state.mode === 'allSettled' || !isError;

    if (shouldContinue && nextIndex < state.itemKeys.length) {
      await this.queueAt(args, nextIndex);
      this.assignState({ currentIndex: nextIndex, results: newResults });
      return;
    }

    // Either done, or aborting in mode 'all' — mark remaining as skipped.
    if (!shouldContinue) {
      for (let i = nextIndex; i < state.itemKeys.length; i++) {
        newResults[state.itemKeys[i]] = {
          status: 'skipped',
          error: 'Earlier item failed; sequence aborted.',
        };
      }
    }

    this.assignState({
      currentIndex: state.itemKeys.length,
      results: newResults,
      aborted: !shouldContinue,
    });
  }

  @Transition({ from: 'awaiting', to: 'end' })
  @Guard('allComplete')
  done(state: SequenceState) {
    this.setResult(this.buildResult(state) as unknown as Record<string, unknown>);
  }

  private allComplete(state: SequenceState): boolean {
    return state.currentIndex >= state.itemKeys.length;
  }

  private async queueAt(args: SequenceArgs, index: number): Promise<void> {
    const [key, item] = args.entries[index];
    const workflowClass = this.resolveClass(item.workflow);
    await this.orchestrator.queue(workflowClass, item.args ?? {}, {
      callback: { transition: 'onChildComplete', metadata: { key } },
      show: item.show ?? 'inline',
      label: item.label,
    });
  }

  private buildResult(state: SequenceState): SequenceResult {
    const errorCount = state.itemKeys.reduce((n, k) => n + (state.results[k]?.status !== 'completed' ? 1 : 0), 0);

    if (state.itemsWereArray) {
      return {
        results: state.itemKeys.map((k) => ({ key: k, ...this.entryOrMissing(state, k) })),
        hasErrors: errorCount > 0,
        errorCount,
      };
    }

    const results: Record<string, SequenceResultEntry> = {};
    for (const k of state.itemKeys) {
      results[k] = this.entryOrMissing(state, k);
    }
    return { results, hasErrors: errorCount > 0, errorCount };
  }

  private entryOrMissing(state: SequenceState, key: string): SequenceResultEntry {
    return state.results[key] ?? { status: 'failed', error: 'No callback received for this item.' };
  }

  private resolveClass(workflowName: string): Type {
    const { instance } = this.registry.resolve(workflowName);
    return instance.constructor as Type;
  }

  private normalizeItems(items: SequenceInput['items']): { entries: SequenceArgs['entries']; itemsWereArray: boolean } {
    const itemsWereArray = Array.isArray(items);
    const rawEntries: Array<[string, SequenceItemInput]> = itemsWereArray
      ? items.map((item, index) => [item.label ?? String(index), item])
      : Object.entries(items);

    const seen = new Set<string>();
    const entries: SequenceArgs['entries'] = rawEntries.map(([key, item]) => {
      if (seen.has(key)) {
        throw new Error(`Sequence item key "${key}" is duplicated. Keys must be unique.`);
      }
      seen.add(key);
      return [key, item];
    });

    return { entries, itemsWereArray };
  }
}
