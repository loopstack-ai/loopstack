import type { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BaseWorkflow,
  CLOCK,
  DocumentEntity,
  StatelessChildRecord,
  StatelessExecutionState,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockName,
  statelessChildCallback,
  statelessChildResultFields,
} from '@loopstack/common';
import type { Clock, WorkflowArgs } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { executedTransitions } from '@loopstack/contracts/types';
import type {
  RunTraceEvent,
  ToolCompletedEvent,
  ToolFailedEvent,
  WorkflowTransitionType,
} from '@loopstack/contracts/types';
import { WorkflowProcessorService, WorkflowRegistryService } from '@loopstack/core';
import { createWorkflowTest } from '../test-builder/workflow-test-builder.js';
import { FailureAnswer, ScriptedAnswers } from './answers.js';
import { RECORD_SINK, RecordSink, RecordToolInterceptor } from './record.js';
import {
  REPLAY_SOURCE,
  REPLAY_TOOLS,
  type ReplayFixture,
  ReplaySource,
  ReplayToolInterceptor,
  replay,
} from './replay.js';

type ModuleImport = Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

/**
 * Options for `runWorkflow`.
 *
 * @public
 */
export interface RunWorkflowOptions {
  /** Modules providing the workflow's dependencies (tools, sub-workflows, services). */
  imports?: ModuleImport[];
  /** Additional providers (e.g. sub-workflow classes, tools) registered directly. */
  providers?: Provider[];
  /**
   * Override providers that come from imported modules (token → replacement value). Use this to
   * replace a tool an imported feature module provides — a plain `providers` entry only shadows
   * tokens the workflow itself resolves at root level.
   */
  overrides?: Array<[token: Type | string | symbol, useValue: unknown]>;
  /**
   * Scripted HITL answers keyed by wait-transition method name. A plain value is re-applied
   * whenever the run (or an inline sub-workflow run) parks on the matching wait transition; a
   * `queue(...)` value is consumed one entry per park and then stops applying, so cyclic
   * workflows park again after the scripted turns. The value becomes the transition's input
   * `data`.
   */
  answers?: Record<string, unknown>;
  /**
   * Safety cap on answer-loop steps (default 50). Exceeding it throws — it means a plain answer
   * keeps re-applying on a cyclic workflow; script a finite sequence with `queue(...)` instead.
   */
  maxSteps?: number;
  /**
   * Fixture file with automatic record/replay: when the file exists the run replays it; when it
   * is missing the run executes tools live and records it. Delete the file to re-record. In CI
   * (`CI` env set) a missing fixture is an error instead — recording is a deliberate local act —
   * unless `LOOPSTACK_RECORD=1` explicitly allows it. Mutually exclusive with `record`/`replay`.
   */
  fixture?: string;
  /** Replay scripted tool responses instead of executing tools live (see `replay()`). */
  replay?: ReplaySource;
  /**
   * The mock boundary for record/replay: which tools consume the scripted responses. `'*'`
   * (the default when omitted) mocks every tool — right for simple workflows. Agent flows
   * declare the LLM explicitly (`replayTools: [LlmGenerateTextTool]`) so the delegation and
   * HITL machinery runs live. Tools outside the boundary always execute for real and are never
   * captured. Accepts tool classes or registered tool names; an empty array is an error.
   */
  replayTools?: Array<Type | string> | '*';
  /**
   * Record every live tool call's args and response envelope as a replay fixture. Pass a file
   * path to write the fixture JSON, or `true` to only expose it on `TestRun.recordings`.
   * Mutually exclusive with `replay`.
   */
  record?: boolean | string;
  /**
   * Replace the framework clock — pass a `TestClock` for reproducible trace timestamps and
   * testable transition timeouts (advance it to fire them).
   */
  clock?: Clock;
  userId?: string;
  workspaceId?: string;
}

/**
 * The result of an in-process workflow test run — assert on it with ordinary `expect`.
 *
 * @public
 */
export interface TestRun {
  status: WorkflowState;
  result: unknown;
  place: string;
  /** Ids of every executed transition (successes and failures alike), across all resume steps, in order. */
  path: string[];
  /** The run's full event trace — transitions, tool calls, documents, children, settles. */
  trace: RunTraceEvent[];
  /** Every tool call the run made, in order (completed and failed). */
  toolCalls: Array<ToolCompletedEvent | ToolFailedEvent>;
  documents: DocumentEntity[];
  /** Inline-executed sub-workflow runs. */
  children: StatelessChildRecord[];
  error?: string;
  /** The fixture captured during this run — present when `options.record` was set. */
  recordings?: ReplayFixture;
  /** Content of the latest non-invalidated document matching the given key or document name. */
  document(nameOrKey: string): unknown;
  /** The raw engine metadata of the final processing step. */
  raw: WorkflowMetadataInterface;
}

const DEFAULT_CONTEXT = {
  root: 'test',
  userId: 'test-user',
  workspaceId: 'test-workspace',
  labels: [] as string[],
  options: { stateless: true },
};

/**
 * Run a workflow in-process against the real state machine — no Redis, no Postgres.
 * Sub-workflows execute inline; HITL waits are answered from `options.answers`; tool responses
 * are replayed from a fixture when `options.replay` is set. Returns a rich, assertable run object.
 *
 * ```ts
 * const run = await runWorkflow(TriageWorkflow, { ticket }, {
 *   replay: replay('__recordings__/triage.json'),
 *   answers: { approveFix: { answer: 'yes' } },
 * });
 * expect(run.status).toBe('completed');
 * expect(run.path).toContain('approve_fix');
 * ```
 *
 * @public
 */
export async function runWorkflow<W extends BaseWorkflow>(
  workflowClass: Type<W>,
  args?: WorkflowArgs<W>,
  options: RunWorkflowOptions = {},
): Promise<TestRun> {
  const { record, replay: replaySource } = resolveReplayMode(options);

  const builder = createWorkflowTest().forWorkflow(workflowClass);
  if (options.imports) builder.withImports(...options.imports);
  if (options.providers) builder.withProviders(...options.providers);
  for (const [token, useValue] of options.overrides ?? []) {
    builder.withOverride(token, useValue as object);
  }
  if (options.clock) {
    builder.withOverride(CLOCK, options.clock);
  }
  if (options.replayTools !== undefined && !record && !replaySource) {
    throw new Error('runWorkflow: `replayTools` has no effect without `record`, `replay`, or `fixture`.');
  }
  if (record || replaySource) {
    if (Array.isArray(options.replayTools) && options.replayTools.length === 0) {
      throw new Error(
        'runWorkflow: `replayTools` is empty — an empty mock boundary records and replays nothing. ' +
          'List the tools to mock, or omit the option to mock all tools.',
      );
    }
    const boundary: '*' | Set<string> =
      options.replayTools === undefined || options.replayTools === '*'
        ? '*'
        : new Set(options.replayTools.map((t) => (typeof t === 'string' ? t : getBlockName(t))));
    builder.withProviders({ provide: REPLAY_TOOLS, useValue: boundary });
  }
  if (replaySource) {
    builder.withProviders({ provide: REPLAY_SOURCE, useValue: replaySource }, ReplayToolInterceptor);
  }
  const recordSink = record ? new RecordSink() : undefined;
  if (recordSink) {
    builder.withProviders({ provide: RECORD_SINK, useValue: recordSink }, RecordToolInterceptor);
  }

  const module = await builder.compile();
  try {
    const workflow = module.get(workflowClass);
    const processor = module.get(WorkflowProcessorService);
    const registry = module.get(WorkflowRegistryService);
    const answers = new ScriptedAnswers(options.answers ?? {});
    const maxSteps = options.maxSteps ?? 50;
    let steps = 0;
    const baseContext = {
      ...DEFAULT_CONTEXT,
      userId: options.userId ?? DEFAULT_CONTEXT.userId,
      workspaceId: options.workspaceId ?? DEFAULT_CONTEXT.workspaceId,
    };
    // Parse args against the workflow's schema, exactly as the production entry point does —
    // defaults apply, invalid args fail loudly.
    const argsSchema = getBlockArgsSchema(workflow);
    const runArgs = argsSchema
      ? (argsSchema.parse(args ?? {}) as Record<string, unknown>)
      : (args as Record<string, unknown> | undefined);

    let meta = await processor.process(workflow, runArgs, { ...baseContext, payload: {} });

    // Answer loop: while parked, resolve one scripted answer to a concrete (workflowId,
    // transition) target — the run itself first, then the parked node tree — and deliver to
    // exactly that node. Stop when nothing resolves — the parked run is returned for assertions.
    while (meta.status === WorkflowState.Waiting) {
      if (++steps > maxSteps) {
        throw new Error(
          `runWorkflow: answer loop exceeded ${maxSteps} steps — a plain scripted answer keeps ` +
            `re-applying on a cyclic workflow. Script a finite sequence with queue(...) or raise maxSteps.`,
        );
      }

      const rootAnswerId = matchAnswer(meta.availableTransitions, answers);
      if (rootAnswerId) {
        const traceBefore = meta.trace.length;
        meta = await processor.process(workflow, runArgs, {
          ...baseContext,
          payload: {
            transition: { id: rootAnswerId, workflowId: '', payload: answerPayload(answers.peek(rootAnswerId)) },
          },
          statelessState: meta.statelessState,
        });
        if (!hasTransitionAttemptSince(meta.trace, traceBefore)) break; // transition guard rejected — no progress
        answers.consume(rootAnswerId);
        continue;
      }

      const target = resolveAnswerTarget(meta.statelessState, answers);
      if (!target) break;
      const delivered = await deliverAnswer(target, meta.statelessState!, answers, processor, registry, baseContext);
      if (!delivered) break; // transition guard rejected — no progress

      // Re-process with the updated carrier: the drain loop applies any newly queued callbacks.
      meta = await processor.process(workflow, runArgs, {
        ...baseContext,
        payload: {},
        statelessState: meta.statelessState,
      });
    }

    // A completed run must have consumed the whole script — fewer calls than scripted is drift.
    if (replaySource && meta.status === WorkflowState.Completed) {
      replaySource.assertFullyConsumed();
    }

    if (recordSink && typeof record === 'string') {
      recordSink.writeTo(record);
    }

    const documents = meta.documents;
    const trace = meta.trace;
    return {
      status: meta.status,
      result: meta.result,
      place: meta.place,
      path: executedTransitions(trace).map((e) => e.transitionId),
      trace,
      toolCalls: trace.filter(
        (e): e is ToolCompletedEvent | ToolFailedEvent => e.type === 'tool.completed' || e.type === 'tool.failed',
      ),
      documents,
      children: meta.statelessState?.children ?? [],
      error: meta.errorMessage,
      ...(recordSink ? { recordings: recordSink.toFixture() } : {}),
      document: (nameOrKey: string) =>
        documents.filter((d) => !d.isInvalidated && (d.key === nameOrKey || d.documentName === nameOrKey)).at(-1)
          ?.content,
      raw: meta,
    };
  } finally {
    await module.close();
  }
}

/**
 * Resolve `fixture`/`record`/`replay` into the effective mode. `fixture` replays when the file
 * exists and records when it is missing — except in CI, where a missing fixture is an error so a
 * forgotten `git add` can never silently degrade the test into a live run.
 */
function resolveReplayMode(options: RunWorkflowOptions): { record?: boolean | string; replay?: ReplaySource } {
  if (!options.fixture) {
    if (options.record && options.replay) {
      throw new Error(
        'runWorkflow: `record` and `replay` are mutually exclusive — a replayed run records nothing new.',
      );
    }
    return { record: options.record, replay: options.replay };
  }

  if (options.record || options.replay) {
    throw new Error('runWorkflow: `fixture` is mutually exclusive with `record` and `replay`.');
  }

  const target = resolve(options.fixture);
  if (existsSync(target)) {
    return { replay: replay(target) };
  }
  if (process.env.CI && process.env.LOOPSTACK_RECORD !== '1') {
    throw new Error(
      `runWorkflow: replay fixture missing in CI: ${target}\n` +
        'Run the test locally to record the fixture, then commit the file. ' +
        '(Set LOOPSTACK_RECORD=1 to allow recording in CI.)',
    );
  }
  return { record: target };
}

/** The first wait-transition id among `transitions` that has an applicable scripted answer. */
function matchAnswer(transitions: WorkflowTransitionType[] | undefined, answers: ScriptedAnswers): string | undefined {
  return (transitions ?? []).map((t) => t.id).find((id) => answers.has(id));
}

/**
 * The transition payload a scripted answer delivers: a `failure()` marker becomes a
 * failed/canceled sub-workflow callback; any other value becomes the answer's `data`.
 */
function answerPayload(value: unknown): Record<string, unknown> {
  return value instanceof FailureAnswer
    ? {
        status: value.status,
        errorMessage: value.errorMessage ?? `Scripted ${value.status} answer`,
        hasError: true,
        data: null,
      }
    : { data: value };
}

/**
 * Whether a transition attempt (`transition.started`) was recorded at or after the given trace
 * index — the progress probe distinguishing "answer applied" from "guard rejected".
 */
function hasTransitionAttemptSince(trace: RunTraceEvent[], index: number): boolean {
  for (let i = index; i < trace.length; i++) {
    if (trace[i].type === 'transition.started') return true;
  }
  return false;
}

/**
 * A concrete answer destination: the parked record the answer belongs to, its ancestor chain
 * (outermost first, target last), and the one transition to deliver.
 */
interface AnswerTarget {
  chain: StatelessChildRecord[];
  transitionId: string;
}

/**
 * Resolve a scripted answer to exactly one parked node, depth-first over the record tree. Pure
 * lookup — no processing. This is the harness's ergonomic layer: answers are scripted by
 * transition name, and this resolver turns the name into an unambiguous (workflowId, transition)
 * target; depth-first order is the documented tie-breaker when several parked nodes wait on the
 * same transition id.
 */
function resolveAnswerTarget(
  carrier: StatelessExecutionState | undefined,
  answers: ScriptedAnswers,
): AnswerTarget | undefined {
  for (const child of carrier?.children ?? []) {
    if (child.status !== WorkflowState.Waiting || !child.statelessState) continue;

    const transitionId = matchAnswer(child.availableTransitions, answers);
    if (transitionId) return { chain: [child], transitionId };

    const nested = resolveAnswerTarget(child.statelessState, answers);
    if (nested) return { chain: [child, ...nested.chain], transitionId: nested.transitionId };
  }
  return undefined;
}

/**
 * Deliver an answer to its resolved target node — addressed by the record's workflowId and the
 * matched transition — then cascade upward: each ancestor is re-processed with an empty payload
 * so its drain loop applies the callback its child queued, mirroring the real orchestration per
 * level. Returns false when the target's transition guard rejected the payload.
 */
async function deliverAnswer(
  target: AnswerTarget,
  rootCarrier: StatelessExecutionState,
  answers: ScriptedAnswers,
  processor: WorkflowProcessorService,
  registry: WorkflowRegistryService,
  baseContext: typeof DEFAULT_CONTEXT,
): Promise<boolean> {
  const parentCarrierOf = (i: number) => (i === 0 ? rootCarrier : target.chain[i - 1].statelessState!);
  const parentIdOf = (i: number) => (i === 0 ? '' : target.chain[i - 1].workflowId);

  const targetIndex = target.chain.length - 1;
  const record = target.chain[targetIndex];
  const { instance } = registry.resolve(record.workflowName);
  const traceBefore = record.statelessState?.trace?.length ?? 0;
  const targetMeta = await processor.process(instance, record.args, {
    ...baseContext,
    payload: {
      transition: {
        id: target.transitionId,
        workflowId: record.workflowId,
        payload: answerPayload(answers.peek(target.transitionId)),
      },
    },
    statelessState: record.statelessState,
  });
  if (!hasTransitionAttemptSince(targetMeta.trace, traceBefore)) return false;
  answers.consume(target.transitionId);
  applyChildMeta(record, targetMeta, parentCarrierOf(targetIndex), parentIdOf(targetIndex));

  for (let i = targetIndex - 1; i >= 0; i--) {
    const ancestor = target.chain[i];
    const { instance: ancestorInstance } = registry.resolve(ancestor.workflowName);
    const ancestorMeta = await processor.process(ancestorInstance, ancestor.args, {
      ...baseContext,
      payload: {},
      statelessState: ancestor.statelessState,
    });
    applyChildMeta(ancestor, ancestorMeta, parentCarrierOf(i), parentIdOf(i));
  }
  return true;
}

/** Update a child record from a processing result and queue its callback on the parent carrier. */
function applyChildMeta(
  record: StatelessChildRecord,
  childMeta: WorkflowMetadataInterface,
  parentCarrier: StatelessExecutionState,
  parentWorkflowId: string,
): void {
  Object.assign(record, statelessChildResultFields(childMeta));
  const callback = statelessChildCallback(record, parentWorkflowId);
  if (callback) {
    (parentCarrier.callbacks ??= []).push(callback);
  }
}
