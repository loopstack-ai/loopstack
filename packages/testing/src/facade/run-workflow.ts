import type { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import {
  BaseWorkflow,
  DocumentEntity,
  StatelessChildRecord,
  StatelessExecutionState,
  WorkflowMetadataInterface,
} from '@loopstack/common';
import type { WorkflowArgs } from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import type { HistoryTransition, TransitionPayloadInterface } from '@loopstack/contracts/types';
import { WorkflowProcessorService, WorkflowRegistryService } from '@loopstack/core';
import { createWorkflowTest } from '../test-builder/workflow-test-builder.js';
import { REPLAY_SOURCE, ReplaySource, ReplayToolInterceptor } from './replay.js';

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
   * Scripted HITL answers keyed by wait-transition method name. Applied whenever the run (or an
   * inline sub-workflow run) parks on a matching wait transition. The value becomes the
   * transition's input `data`.
   */
  answers?: Record<string, unknown>;
  /** Replay recorded tool responses instead of executing tools live (see `replay()`). */
  replay?: ReplaySource;
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
  /** Ids of every executed transition, across all resume steps, in order. */
  path: string[];
  history: HistoryTransition[];
  documents: DocumentEntity[];
  /** Inline-executed sub-workflow runs. */
  children: StatelessChildRecord[];
  error?: string;
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
  const builder = createWorkflowTest().forWorkflow(workflowClass);
  if (options.imports) builder.withImports(...options.imports);
  if (options.providers) builder.withProviders(...options.providers);
  if (options.replay) {
    builder.withProviders({ provide: REPLAY_SOURCE, useValue: options.replay }, ReplayToolInterceptor);
  }

  const module = await builder.compile();
  try {
    const workflow = module.get(workflowClass);
    const processor = module.get(WorkflowProcessorService);
    const registry = module.get(WorkflowRegistryService);
    const answers = options.answers ?? {};
    const baseContext = {
      ...DEFAULT_CONTEXT,
      userId: options.userId ?? DEFAULT_CONTEXT.userId,
      workspaceId: options.workspaceId ?? DEFAULT_CONTEXT.workspaceId,
    };
    const runArgs = args as Record<string, unknown> | undefined;

    const history: HistoryTransition[] = [];
    let meta = await processor.process(workflow, runArgs, { ...baseContext, payload: {} });
    history.push(...meta.history);

    // Answer loop: while parked, try a scripted answer on the run itself, then on parked
    // inline children. Stop when nothing applies — the parked run is returned for assertions.
    while (meta.status === WorkflowState.Waiting) {
      const parentAnswer = findParentAnswer(meta, answers);
      if (parentAnswer) {
        meta = await processor.process(workflow, runArgs, {
          ...baseContext,
          payload: { transition: parentAnswer },
          statelessState: meta.statelessState,
        });
        if (meta.history.length === 0) break; // guard rejected or not applicable — no progress
        history.push(...meta.history);
        continue;
      }

      const answeredChild = await answerParkedChild(meta.statelessState, answers, processor, registry, baseContext);
      if (!answeredChild) break;

      // Re-process with the updated carrier: the drain loop applies any newly queued callbacks.
      meta = await processor.process(workflow, runArgs, {
        ...baseContext,
        payload: {},
        statelessState: meta.statelessState,
      });
      history.push(...meta.history);
    }

    const documents = meta.documents;
    return {
      status: meta.status,
      result: meta.result,
      place: meta.place,
      path: history.map((t) => t.id),
      history,
      documents,
      children: meta.statelessState?.children ?? [],
      error: meta.errorMessage,
      document: (nameOrKey: string) =>
        documents.filter((d) => !d.isInvalidated && (d.key === nameOrKey || d.documentName === nameOrKey)).at(-1)
          ?.content,
      raw: meta,
    };
  } finally {
    await module.close();
  }
}

function findParentAnswer(
  meta: WorkflowMetadataInterface,
  answers: Record<string, unknown>,
): TransitionPayloadInterface | undefined {
  const available = (meta.availableTransitions ?? []).map((t) => t.id);
  const id = available.find((transitionId) => transitionId in answers);
  if (!id) return undefined;
  return { id, workflowId: '', payload: { data: answers[id] } };
}

/**
 * Try each scripted answer against each parked inline child. On a hit, the child is re-processed
 * with the answer; if it reaches a terminal state and has a callback transition, the callback
 * envelope is queued on the parent carrier (mirroring the orchestration service).
 */
async function answerParkedChild(
  carrier: StatelessExecutionState | undefined,
  answers: Record<string, unknown>,
  processor: WorkflowProcessorService,
  registry: WorkflowRegistryService,
  baseContext: typeof DEFAULT_CONTEXT,
): Promise<boolean> {
  if (!carrier?.children) return false;

  for (const child of carrier.children) {
    if (child.status !== WorkflowState.Waiting || !child.statelessState) continue;

    // The child record carries no availableTransitions — attempt each scripted answer and let
    // the engine decide applicability (a non-applicable transition leaves history empty).
    let childMeta: WorkflowMetadataInterface | undefined;
    const { instance } = registry.resolve(child.workflowName);
    for (const [id, answer] of Object.entries(answers)) {
      const attempt = await processor.process(instance, child.args, {
        ...baseContext,
        payload: { transition: { id, workflowId: '', payload: { data: answer } } },
        statelessState: child.statelessState,
      });
      if (attempt.history.length > 0) {
        childMeta = attempt;
        break;
      }
    }
    if (!childMeta) continue;

    child.status = childMeta.status;
    child.result = childMeta.result ?? null;
    child.documents = childMeta.documents;
    child.statelessState = childMeta.statelessState;
    child.hasError = childMeta.hasError;
    child.errorMessage = childMeta.errorMessage;

    const terminal =
      childMeta.status === WorkflowState.Completed ||
      childMeta.status === WorkflowState.Failed ||
      childMeta.status === WorkflowState.Canceled;

    if (terminal && child.callbackTransition) {
      (carrier.callbacks ??= []).push({
        id: child.callbackTransition,
        workflowId: '',
        payload: {
          workflowId: child.workflowId,
          status: childMeta.status,
          hasError: childMeta.hasError ?? false,
          errorMessage: childMeta.errorMessage ?? null,
          data: childMeta.result ?? null,
          ...(child.callbackMetadata ? { meta: child.callbackMetadata } : {}),
        },
      });
    }
    return true;
  }
  return false;
}
