import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  TransitionMetadata,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getGuardMetadataMap,
  getWorkflowStateSchema,
} from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { WorkflowState, WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { ConfigTraceError, Processor } from '../../../common/index.js';
import { ExecutionScope, ExecutionScopeData } from '../../utils/index.js';
import { TransitionResolverService } from '../transition-resolver.service.js';
import { WorkflowMemoryMonitorService } from '../workflow-memory-monitor.service.js';
import { WorkflowStateService } from '../workflow-state.service.js';

/** Creates a promise that rejects after the given timeout */
function rejectAfter(ms: number, methodName: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Transition '${methodName}' timed out after ${ms}ms`)), ms),
  );
}

/**
 * Per-run metadata managed by the processor as a local variable.
 * NOT stored in ExecutionScope — only the processor reads/writes this.
 */
interface ProcessorMetadata extends WorkflowMetadataInterface {
  /** Checkpoint version counter */
  version: number;
}

@Injectable()
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly transitionResolverService: TransitionResolverService,
    private readonly executionScope: ExecutionScope,
    private readonly memoryMonitor: WorkflowMemoryMonitorService,
    private readonly dataSource: DataSource,
  ) {}

  async process(
    workflow: WorkflowInterface,
    args: Record<string, unknown> | undefined,
    context: {
      root: string;
      userId: string;
      workspaceId: string;
      workflowId?: string;
      labels: string[];
      payload: Record<string, unknown>;
      workflowContext?: Record<string, unknown>;
      workflowEntity?: WorkflowEntity;
      options: { stateless: boolean };
    },
  ): Promise<WorkflowMetadataInterface> {
    const isStateless = !!context.options?.stateless;

    let workflowEntity: WorkflowEntity | undefined;
    let pendingTransition: TransitionPayloadInterface | undefined;
    let latestCheckpoint: WorkflowCheckpointEntity | null = null;

    // Initialize processor metadata
    const meta: ProcessorMetadata = {
      hasError: false,
      stop: false,
      status: WorkflowStateEnum.Pending,
      availableTransitions: [],
      persistenceState: { documentsUpdated: false },
      documents: [],
      place: 'start',
      tools: {},
      result: null,
      retryCount: 0,
      retryTransitionId: undefined,
      version: 1,
    };

    if (isStateless) {
      meta.status = WorkflowStateEnum.Running;
    } else {
      workflowEntity = context.workflowEntity!;
      context.workflowId = workflowEntity.id;

      latestCheckpoint = await this.workflowStateService.getLatestCheckpoint(workflowEntity.id);

      // Populate metadata from entity
      meta.status = workflowEntity.status ?? WorkflowState.Pending;
      meta.documents = workflowEntity.documents ?? [];
      meta.place = workflowEntity.place ?? 'start';
      meta.retryCount = workflowEntity.retryCount ?? 0;
      meta.retryTransitionId = workflowEntity.retryTransitionId ?? undefined;

      // Detach documents from entity — they now live in processor metadata
      if (workflowEntity) {
        delete (workflowEntity as unknown as Record<string, unknown>).documents;
      }

      const isInitialRun = meta.place === 'start';

      const payloadTransition = (context.payload as Record<string, unknown>)?.transition as
        | TransitionPayloadInterface
        | undefined;
      pendingTransition =
        !isInitialRun && payloadTransition?.workflowId === context.workflowId ? payloadTransition : undefined;

      const isRetry = !!workflowEntity.hasError;

      if (!isInitialRun && !pendingTransition && !isRetry) {
        this.logger.debug('Skipping processing since state is already processed.');
        return meta;
      }

      meta.status = WorkflowStateEnum.Running;
    }

    // Load state from checkpoint or start empty
    let state: Record<string, unknown> = latestCheckpoint ? (latestCheckpoint.state ?? {}) : {};
    const checkpointVersion = latestCheckpoint ? latestCheckpoint.version + 1 : 1;
    meta.version = checkpointVersion;

    // Build the scope data for tools/documents
    const scopeData: ExecutionScopeData = {
      userId: context.userId,
      workspaceId: context.workspaceId,
      workflowId: context.workflowId ?? '',
      labels: context.labels ?? [],
      args: args ? Object.freeze({ ...args }) : undefined,
      options: context.options,
      cache: new Map(),
      queryRunner: null,
      documents: meta.documents,
      persistenceState: meta.persistenceState,
      transition: undefined,
      // Re-seeded before each transition; initial values never read
      stateDraft: {},
      resultDraft: {},
      resultDirty: false,
    };

    this.logger.debug(`Process state machine for workflow ${workflow.constructor.name}`);
    this.memoryMonitor.logWorkflowStart(workflow.constructor.name);

    try {
      state = await this.processStateMachine(scopeData, meta, workflow, pendingTransition, workflowEntity, state);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(new ConfigTraceError(error, workflow));
      meta.errorMessage = error.message;
      meta.hasError = true;
      meta.place = 'error';
    }

    const hasRetrySignal = !!meta._retrySignal;

    if (hasRetrySignal) {
      meta.stop = true;
      meta.status = WorkflowState.Waiting;
    } else if (meta.hasError) {
      meta.stop = true;
      meta.status = WorkflowState.Failed;
    } else if (meta.place === 'end') {
      meta.status = WorkflowState.Completed;
    } else {
      meta.stop = true;
      meta.status = WorkflowState.Waiting;
    }

    // Sync documents back from scope (document persistence mutates the array)
    meta.documents = scopeData.documents;
    meta.persistenceState = scopeData.persistenceState;

    this.memoryMonitor.logWorkflowEnd(workflow.constructor.name, meta.documents, meta.version);

    if (workflowEntity) {
      await this.workflowStateService.saveExecutionState(workflowEntity, state, meta, undefined, { checkpoint: false });
    }
    return meta;
  }

  /**
   * Build a WorkflowContext from the scope data.
   */
  private buildWorkflowContext(scopeData: ExecutionScopeData, meta: ProcessorMetadata): RunContext {
    return {
      userId: scopeData.userId,
      workspaceId: scopeData.workspaceId,
      workflowId: scopeData.workflowId,
      args: scopeData.args,
      execution: {
        place: meta.place,
        retryCount: meta.retryCount ?? 0,
      },
    };
  }

  /**
   * Invoke a transition method with the (state, ...rest, ctx) calling convention.
   *
   * - Auto transitions (including initial and final): `method(state, ctx)`
   * - Wait transitions: `method(state, payload, ctx)`
   *
   * Transitions return nothing — they mutate state/result via `this.assignState` /
   * `this.setState` / `this.assignResult` / `this.setResult`. A non-undefined
   * return throws via `assertVoidReturn`. `await` works on both Promises and
   * plain values, so transitions may be `async` or sync depending on their body.
   */
  private invokeTransition(
    workflow: WorkflowInterface,
    methodName: string,
    workflowCtx: RunContext,
    state: Record<string, unknown>,
    data?: unknown,
  ): Promise<unknown> {
    const method = (workflow as Record<string, unknown>)[methodName];
    if (typeof method !== 'function') {
      throw new Error(`Method '${methodName}' not found on workflow ${workflow.constructor.name}`);
    }

    if (data !== undefined) {
      // Wait transition: (state, payload, ctx)
      return (method as (...args: unknown[]) => Promise<unknown>).call(workflow, state, data, workflowCtx);
    } else {
      // Auto transition (initial, normal, final): (state, ctx)
      return (method as (...args: unknown[]) => Promise<unknown>).call(workflow, state, workflowCtx);
    }
  }

  /**
   * Validates the workflow state against the `@Workflow({ stateSchema })` Zod schema, if defined.
   * Runs after the transition's state draft is committed and before persistence.
   * Throws if validation fails — caught by the executeTransition try/catch as a transition error.
   */
  private validateState(
    workflow: WorkflowInterface,
    methodName: string,
    to: string,
    newState: Record<string, unknown>,
  ): void {
    const stateSchema = getWorkflowStateSchema(workflow);
    if (!stateSchema) return;

    const result = stateSchema.safeParse(newState);
    if (result.success) return;

    const issues = result.error.issues
      .map((i) => `${i.path.length ? i.path.join('.') : '<root>'}: ${i.message}`)
      .join('; ');
    throw new Error(
      `State validation failed after transition '${methodName}' (→ ${to}) on ${workflow.constructor.name}: ${issues}`,
    );
  }

  /**
   * Enforces the void-return contract on transition methods. Transitions mutate
   * state and result via `this.assignState` / `this.setState` / `this.assignResult` /
   * `this.setResult`; a non-undefined return is a programming error.
   */
  private assertVoidReturn(workflow: WorkflowInterface, methodName: string, returnValue: unknown): void {
    if (returnValue === undefined) return;
    throw new Error(
      `Transition '${methodName}' on ${workflow.constructor.name} returned a value. ` +
        `Transitions must return void — use this.assignState() / this.setState() / ` +
        `this.assignResult() / this.setResult() instead.`,
    );
  }

  /**
   * Invoke a guard method with state as the first argument.
   */
  private invokeGuard(
    workflow: WorkflowInterface,
    guardMethodName: string,
    state: Record<string, unknown>,
  ): boolean | Promise<boolean> {
    const method = (workflow as Record<string, unknown>)[guardMethodName];
    if (typeof method !== 'function') {
      throw new Error(`Guard method '${guardMethodName}' not found on workflow ${workflow.constructor.name}`);
    }
    return (method as (s: Record<string, unknown>) => boolean | Promise<boolean>).call(workflow, state);
  }

  /**
   * Executes a single transition within a DB transaction.
   */
  private async executeTransition(
    scopeData: ExecutionScopeData,
    meta: ProcessorMetadata,
    workflow: WorkflowInterface,
    methodName: string,
    to: string,
    data: unknown,
    state: Record<string, unknown>,
    workflowEntity: WorkflowEntity | undefined,
    workflowName: string,
    transitionMeta?: TransitionMetadata,
  ): Promise<{ returnValue: unknown; newState: Record<string, unknown> }> {
    const defaultTimeout = parseInt(process.env.DEFAULT_TRANSITION_TIMEOUT ?? '', 10) || 300_000;
    const timeoutMs = transitionMeta?.timeout ?? defaultTimeout;
    const workflowCtx = this.buildWorkflowContext(scopeData, meta);

    const invokeMethod = () => {
      // Seed per-transition drafts from current state/result. assignState/setState/
      // assignResult/setResult on BaseWorkflow mutate these drafts via the ALS scope.
      scopeData.stateDraft = { ...state };
      scopeData.resultDraft = meta.result ? { ...meta.result } : {};
      scopeData.resultDirty = false;

      const methodPromise = this.executionScope.run(scopeData, () =>
        this.invokeTransition(workflow, methodName, workflowCtx, state, data),
      );
      return timeoutMs > 0 ? Promise.race([methodPromise, rejectAfter(timeoutMs, methodName)]) : methodPromise;
    };

    // Stateless workflows skip transactions
    if (!workflowEntity) {
      const returnValue = await invokeMethod();
      this.assertVoidReturn(workflow, methodName, returnValue);

      const newState = scopeData.stateDraft;
      this.validateState(workflow, methodName, to, newState);
      if (scopeData.resultDirty) {
        meta.result = scopeData.resultDraft;
      }

      meta.place = to;
      meta.version++;
      this.memoryMonitor.logTransition(workflowName, methodName, scopeData.documents, meta.version);

      return { returnValue, newState };
    }

    // Snapshot in-memory documents for rollback on failure
    const documentsSnapshot = structuredClone(scopeData.documents);
    const persistenceStateSnapshot = structuredClone(scopeData.persistenceState);
    const resultSnapshot = meta.result;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      scopeData.queryRunner = queryRunner;

      this.logger.debug(`Applying transition: ${methodName} (${meta.place} → ${to})`);

      const returnValue = await invokeMethod();
      this.assertVoidReturn(workflow, methodName, returnValue);

      const newState = scopeData.stateDraft;
      this.validateState(workflow, methodName, to, newState);
      if (scopeData.resultDirty) {
        meta.result = scopeData.resultDraft;
      }

      // Advance place + bump version
      meta.place = to;
      meta.version++;
      this.memoryMonitor.logTransition(workflowName, methodName, scopeData.documents, meta.version);

      // Sync documents from scope back to metadata before saving
      meta.documents = scopeData.documents;
      meta.persistenceState = scopeData.persistenceState;

      // Save workflow state within the same transaction
      await this.workflowStateService.saveExecutionState(workflowEntity, newState, meta, queryRunner);

      await queryRunner.commitTransaction();
      return { returnValue, newState };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Restore in-memory cache to pre-transition state
      scopeData.documents = documentsSnapshot;
      scopeData.persistenceState = persistenceStateSnapshot;
      meta.result = resultSnapshot;

      throw error;
    } finally {
      scopeData.queryRunner = null;
      await queryRunner.release();
    }
  }

  /**
   * Handles a transition error according to the retry configuration.
   */
  private async handleTransitionError(
    meta: ProcessorMetadata,
    error: Error,
    transitionMeta: TransitionMetadata,
  ): Promise<void> {
    meta.version++;

    const { methodName, retryAttempts, retryDelay, retryBackoff, retryMaxDelay, retryTarget, errorPlace } =
      transitionMeta;

    // retryCount is scoped to the originating transition. Reset when we land on a different one.
    let retryCount: number = meta.retryCount ?? 0;
    if (meta.retryTransitionId !== methodName) {
      retryCount = 0;
    }

    this.logger.warn(`Transition '${methodName}' failed (attempt ${retryCount + 1}): ${error.message}`);

    // 1. Auto-retry path
    if (retryAttempts > 0 && retryCount < retryAttempts) {
      retryCount++;
      meta.retryCount = retryCount;
      meta.retryTransitionId = methodName;
      meta.errorMessage = error.message;
      meta.hasError = true;

      const delayMs =
        retryBackoff === 'exponential' ? Math.min(retryDelay * Math.pow(2, retryCount - 1), retryMaxDelay) : retryDelay;

      if (retryTarget) {
        this.logger.log(
          `Auto-retry ${retryCount}/${retryAttempts} for '${methodName}' via target place '${retryTarget}' in ${delayMs}ms`,
        );
        meta.place = retryTarget;
      } else {
        this.logger.log(`Auto-retry ${retryCount}/${retryAttempts} for '${methodName}' in ${delayMs}ms`);
      }
      meta._retrySignal = { delayMs };
      return;
    }

    // 2. Error place path — retries exhausted or non-retryable failure
    if (errorPlace) {
      this.logger.log(`Routing failure of '${methodName}' to error place '${errorPlace}'`);
      meta.place = errorPlace;
      meta.hasError = true;
      meta.errorMessage = error.message;
      meta.retryCount = 0;
      meta.retryTransitionId = undefined;
      return;
    }

    // 3. Manual retry default — stay at place, expose Retry button
    this.logger.log(`Transition '${methodName}' failed — staying at current place for manual retry`);
    meta.hasError = true;
    meta.errorMessage = error.message;
    meta.retryCount = retryCount + 1;
    meta.retryTransitionId = methodName;
  }

  /**
   * Clear retry bookkeeping when a transition succeeds. Only clears state that belongs
   * to the just-succeeded transition — so when `retryTarget` routes the workflow through
   * an intermediate place, successful transitions there don't wipe the originator's count.
   */
  private clearRetryState(meta: ProcessorMetadata, justSucceededMethodName: string): void {
    if (meta.retryTransitionId === justSucceededMethodName) {
      meta.retryCount = 0;
      meta.retryTransitionId = undefined;
    }
  }

  private async processStateMachine(
    scopeData: ExecutionScopeData,
    meta: ProcessorMetadata,
    workflow: WorkflowInterface,
    pendingTransition: TransitionPayloadInterface | undefined,
    workflowEntity: WorkflowEntity | undefined,
    state: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const guards = getGuardMetadataMap(workflow);
    const workflowName = workflow.constructor.name;

    // Handle pending (manual/wait) transition first
    if (pendingTransition) {
      const available = this.transitionResolverService.getAvailableTransitions(workflow, meta.place);
      const waitTransition = available.find((t) => t.wait && t.methodName === pendingTransition.id);

      if (waitTransition) {
        meta.transition = {
          id: waitTransition.methodName,
          from: meta.place,
          to: waitTransition.to,
          payload: pendingTransition.payload,
          meta: pendingTransition.meta,
        };
        scopeData.transition = meta.transition;

        // Evaluate guard with state
        const guard = guards.get(waitTransition.methodName);
        if (guard) {
          const passes = await this.executionScope.run(scopeData, () => {
            return this.invokeGuard(workflow, guard.guardMethodName, state);
          });
          if (!passes) {
            this.logger.debug(
              `Guard '${guard.guardMethodName}' rejected pending transition '${waitTransition.methodName}'`,
            );
            return state;
          }
        }

        if (workflowEntity) {
          await this.workflowStateService.saveExecutionState(workflowEntity, state, meta, undefined, {
            checkpoint: false,
          });
        }

        const rawPayload = (pendingTransition.payload ?? {}) as Record<string, unknown>;
        const rawData = 'data' in rawPayload ? rawPayload.data : undefined;
        const status = (rawPayload.status as 'completed' | 'failed' | 'canceled' | undefined) ?? 'completed';
        const isFailureCallback = status === 'failed' || status === 'canceled';

        // Sub-workflow failure callback: route to the transition's declared failure handling
        // (retryAttempts / errorPlace) if it opted in. Otherwise fall through to the body —
        // preserves the existing pattern where a callback transition handles failures inline
        // (e.g. LLM tool delegation accumulating tool_result entries with isError: true).
        if (isFailureCallback && (waitTransition.errorPlace || waitTransition.retryAttempts > 0)) {
          const errorMessage = (rawPayload.errorMessage as string | null | undefined) ?? `Sub-workflow ${status}`;
          const subError = new Error(errorMessage);
          this.logger.warn(
            `Wait transition '${waitTransition.methodName}' received ${status} callback: ${errorMessage}`,
          );
          await this.handleTransitionError(meta, subError, waitTransition);

          const errorAvailable = this.transitionResolverService.getAvailableTransitions(workflow, meta.place);
          meta.availableTransitions = errorAvailable.map((t) => ({
            id: t.methodName,
            from: meta.place,
            to: t.to,
            trigger: t.wait ? ('manual' as const) : undefined,
          }));
          return state;
        }

        // Skip schema validation for sub-workflow failure callbacks that fall through to the body —
        // their `data` is whatever the sub-workflow's final result was (often null when it never
        // reached setResult), and the parent's transition still needs to run so it can react.
        const validatedData =
          waitTransition.schema && !isFailureCallback ? waitTransition.schema.parse(rawData) : rawData;
        const transitionInput = {
          workflowId: (rawPayload.workflowId as string | undefined) ?? pendingTransition.workflowId,
          status,
          hasError: typeof rawPayload.hasError === 'boolean' ? rawPayload.hasError : status !== 'completed',
          errorMessage: (rawPayload.errorMessage as string | null | undefined) ?? null,
          data: validatedData,
          ...(rawPayload.meta !== undefined ? { meta: rawPayload.meta } : {}),
        };

        try {
          const result = await this.executeTransition(
            scopeData,
            meta,
            workflow,
            waitTransition.methodName,
            waitTransition.to,
            transitionInput,
            state,
            workflowEntity,
            workflowName,
            waitTransition,
          );
          state = result.newState;
          this.clearRetryState(meta, waitTransition.methodName);
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          this.logger.error(new ConfigTraceError(error, workflow));
          await this.handleTransitionError(meta, error, waitTransition);

          const errorAvailable = this.transitionResolverService.getAvailableTransitions(workflow, meta.place);
          meta.availableTransitions = errorAvailable.map((t) => ({
            id: t.methodName,
            from: meta.place,
            to: t.to,
            trigger: t.wait ? ('manual' as const) : undefined,
          }));
          return state;
        }
      }
    }

    // Auto-transition loop
    while (true) {
      const available = this.transitionResolverService.getAvailableTransitions(workflow, meta.place);

      meta.availableTransitions = available.map((t) => ({
        id: t.methodName,
        from: meta.place,
        to: t.to,
        trigger: t.wait ? ('manual' as const) : undefined,
      }));

      if (meta.place === 'end') break;

      meta.nextPlace = undefined;

      // Resolve next auto-transition — pass state for guard evaluation
      const next = await this.executionScope.run(scopeData, () => {
        return this.transitionResolverService.resolveNextTransition(workflow, available, guards, state);
      });

      if (!next) break;

      meta.transition = {
        id: next.methodName,
        from: meta.place,
        to: next.to,
        payload: null,
      };
      scopeData.transition = meta.transition;

      if (workflowEntity) {
        await this.workflowStateService.saveExecutionState(workflowEntity, state, meta, undefined, {
          checkpoint: false,
        });
      }

      try {
        const result = await this.executeTransition(
          scopeData,
          meta,
          workflow,
          next.methodName,
          next.to,
          undefined,
          state,
          workflowEntity,
          workflowName,
          next,
        );
        state = result.newState;
        this.clearRetryState(meta, next.methodName);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        this.logger.error(new ConfigTraceError(error, workflow));
        await this.handleTransitionError(meta, error, next);

        const errorAvailable = this.transitionResolverService.getAvailableTransitions(workflow, meta.place);
        meta.availableTransitions = errorAvailable.map((t) => ({
          id: t.methodName,
          from: meta.place,
          to: t.to,
          trigger: t.wait ? ('manual' as const) : undefined,
        }));
        break;
      }
    }

    return state;
  }
}
