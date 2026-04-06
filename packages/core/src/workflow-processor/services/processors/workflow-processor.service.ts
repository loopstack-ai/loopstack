import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RunContext,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockTools,
  getGuardMetadataMap,
} from '@loopstack/common';
import { WorkflowState, WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { ConfigTraceError, Processor } from '../../../common';
import { ExecutionContextManager, ExecutionScope, WorkflowExecutionContextManager } from '../../utils';
import { CheckpointState, StateManager } from '../../utils/state/state-manager';
import { ToolExecutionService } from '../tool-execution.service';
import { TransitionResolverService } from '../transition-resolver.service';
import { WorkflowMemoryMonitorService } from '../workflow-memory-monitor.service';
import { WorkflowStateService } from '../workflow-state.service';

/** Invoke a named method on a workflow proxy, optionally passing data as the first argument */
function invokeWorkflowMethod(proxy: WorkflowInterface, methodName: string, data?: unknown): Promise<unknown> {
  const method = (proxy as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') {
    throw new Error(`Method '${methodName}' not found on workflow ${proxy.constructor.name}`);
  }
  return (method as (arg?: unknown) => Promise<unknown>).call(proxy, data);
}

/** Invoke a guard method on a workflow proxy, returning whether the guard passes */
function invokeGuardMethod(proxy: WorkflowInterface, guardMethodName: string): boolean | Promise<boolean> {
  const method = (proxy as Record<string, unknown>)[guardMethodName];
  if (typeof method !== 'function') {
    throw new Error(`Guard method '${guardMethodName}' not found on workflow ${proxy.constructor.name}`);
  }
  return (method as () => boolean | Promise<boolean>).call(proxy);
}

@Injectable()
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly transitionResolverService: TransitionResolverService,
    private readonly executionScope: ExecutionScope,
    private readonly memoryMonitor: WorkflowMemoryMonitorService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly dataSource: DataSource,
  ) {}

  createCtx(
    workflow: WorkflowInterface,
    context: RunContext,
    validArgs: Record<string, unknown> | undefined,
    workflowEntity?: WorkflowEntity,
    latestCheckpoint?: WorkflowCheckpointEntity | null,
  ): WorkflowExecutionContextManager {
    const initialWorkflowData: WorkflowMetadataInterface = {
      hasError: false,
      stop: false,
      status: workflowEntity?.status ?? WorkflowState.Pending,
      availableTransitions: [],
      persistenceState: {
        documentsUpdated: false,
      },
      documents: workflowEntity?.documents ?? [],
      place: workflowEntity?.place ?? 'start',
      tools: {},
      result: null,
    };

    // Detach documents from entity — they now live in the StateManager.
    // Prevents TypeORM from touching document rows when saving the workflow.
    if (workflowEntity) {
      delete (workflowEntity as unknown as Record<string, unknown>).documents;
    }

    const checkpoint: CheckpointState<Record<string, unknown>> | null = latestCheckpoint
      ? {
          state: latestCheckpoint.state,
          tools: latestCheckpoint.tools,
          version: latestCheckpoint.version,
        }
      : null;

    const stateManager = new StateManager<Record<string, unknown>, WorkflowMetadataInterface>(
      undefined,
      initialWorkflowData,
      checkpoint,
    );
    return new ExecutionContextManager<
      Record<string, unknown> | undefined,
      Record<string, unknown>,
      WorkflowMetadataInterface
    >(workflow, context, validArgs, stateManager);
  }

  async process(
    workflow: WorkflowInterface,
    args: Record<string, unknown> | undefined,
    context: RunContext,
  ): Promise<WorkflowMetadataInterface> {
    const schema = getBlockArgsSchema(workflow);
    const validArgs = schema ? (schema.parse(args) as Record<string, unknown> | undefined) : args;

    const isStateless = !!context.options?.stateless;

    let workflowEntity: WorkflowEntity | undefined;
    let pendingTransition: TransitionPayloadInterface | undefined;
    let ctx: WorkflowExecutionContextManager;

    if (isStateless) {
      ctx = this.createCtx(workflow, context, validArgs);
      ctx.getManager().setData('status', WorkflowStateEnum.Running);
    } else {
      workflowEntity = context.workflowEntity!;
      context.workflowId = workflowEntity.id;

      const latestCheckpoint = await this.workflowStateService.getLatestCheckpoint(workflowEntity.id);
      ctx = this.createCtx(workflow, context, validArgs, workflowEntity, latestCheckpoint);

      const isInitialRun = workflowEntity.place === 'start';

      pendingTransition =
        !isInitialRun && ctx.getContext().payload?.transition?.workflowId === ctx.getContext().workflowId
          ? ctx.getContext().payload?.transition
          : undefined;

      if (!isInitialRun && !pendingTransition) {
        this.logger.debug('Skipping processing since state is already processed.');
        return ctx.getData();
      }

      ctx.getManager().setData('status', WorkflowStateEnum.Running);
    }

    // Wire @FrameworkService properties on workflow and tools
    this.wireFrameworkServices(workflow);

    this.logger.debug(`Process state machine for workflow ${workflow.constructor.name}`);
    this.memoryMonitor.logWorkflowStart(workflow.constructor.name);

    try {
      await this.processStateMachine(ctx, pendingTransition, workflowEntity);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(new ConfigTraceError(error, ctx.getInstance()));
      ctx.getManager().setData('errorMessage', error.message);
      ctx.getManager().setData('hasError', true);
      ctx.getManager().setData('place', 'error');
    }

    if (ctx.getManager().getData('hasError')) {
      ctx.getManager().setData('stop', true);
      ctx.getManager().setData('status', WorkflowState.Failed);
    } else if (ctx.getManager().getData('place') === 'end') {
      ctx.getManager().setData('status', WorkflowState.Completed);
    } else {
      ctx.getManager().setData('stop', true);
      ctx.getManager().setData('status', WorkflowState.Waiting);
    }

    this.memoryMonitor.logWorkflowEnd(workflow.constructor.name, ctx);

    if (workflowEntity) {
      await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
    }
    return ctx.getData();
  }

  /**
   * Executes a single transition within a DB transaction.
   *
   * All document saves (via repository.save() or tool side effects) that happen
   * during the transition use the scoped queryRunner. If the transition throws,
   * the transaction rolls back — including any documents persisted during it.
   * The in-memory document cache is restored to its pre-transition state.
   */
  private async executeTransition(
    ctx: WorkflowExecutionContextManager,
    proxy: WorkflowInterface,
    methodName: string,
    to: string,
    data: unknown,
    workflowEntity: WorkflowEntity | undefined,
    workflowName: string,
  ): Promise<unknown> {
    // Stateless workflows skip transactions
    if (!workflowEntity) {
      const returnValue = await this.executionScope.run(ctx, () => {
        return invokeWorkflowMethod(proxy, methodName, data);
      });

      ctx.getManager().setData('place', to);
      ctx.getManager().checkpoint();
      this.memoryMonitor.logTransition(workflowName, methodName, ctx);

      return returnValue;
    }

    // Snapshot in-memory documents for rollback on failure
    const documentsSnapshot = structuredClone(ctx.getManager().getData('documents'));
    const persistenceStateSnapshot = structuredClone(ctx.getManager().getData('persistenceState'));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      ctx.setQueryRunner(queryRunner);

      this.logger.debug(`Applying transition: ${methodName} (${ctx.getManager().getData('place')} → ${to})`);

      const returnValue = await this.executionScope.run(ctx, () => {
        return invokeWorkflowMethod(proxy, methodName, data);
      });

      // Capture transition return value as result
      if (returnValue !== undefined && returnValue !== null) {
        ctx.getManager().setData('result', returnValue as Record<string, unknown>);
      }

      // Advance place + persist
      ctx.getManager().setData('place', to);
      ctx.getManager().checkpoint();
      this.memoryMonitor.logTransition(workflowName, methodName, ctx);

      // Save workflow state within the same transaction
      await this.workflowStateService.saveExecutionState(workflowEntity, ctx, queryRunner);

      await queryRunner.commitTransaction();
      return returnValue;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Restore in-memory cache to pre-transition state
      ctx.getManager().setData('documents', documentsSnapshot);
      ctx.getManager().setData('persistenceState', persistenceStateSnapshot);

      throw error;
    } finally {
      ctx.setQueryRunner(null);
      await queryRunner.release();
    }
  }

  private async processStateMachine(
    ctx: WorkflowExecutionContextManager,
    pendingTransition: TransitionPayloadInterface | undefined,
    workflowEntity: WorkflowEntity | undefined,
  ): Promise<void> {
    const proxy = ctx.getInstance();
    const workflow = proxy;
    const guards = getGuardMetadataMap(workflow);
    const workflowName = workflow.constructor.name;

    // Handle pending (manual/wait) transition first
    if (pendingTransition) {
      const currentPlace = ctx.getManager().getData('place');
      const available = this.transitionResolverService.getAvailableTransitions(workflow, currentPlace);
      const waitTransition = available.find((t) => t.wait && t.methodName === pendingTransition.id);

      if (waitTransition) {
        // Set transition info on metadata
        ctx.getManager().setData('transition', {
          id: waitTransition.methodName,
          from: currentPlace,
          to: waitTransition.to,
          payload: pendingTransition.payload,
          meta: pendingTransition.meta,
        });

        // Evaluate guard if present
        const guard = guards.get(waitTransition.methodName);
        if (guard) {
          const passes = await this.executionScope.run(ctx, () => {
            return invokeGuardMethod(proxy, guard.guardMethodName);
          });
          if (!passes) {
            this.logger.debug(
              `Guard '${guard.guardMethodName}' rejected pending transition '${waitTransition.methodName}'`,
            );
            return;
          }
        }

        // Pre-transition persistence (committed state — recovery point if transition fails)
        if (workflowEntity) {
          await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
        }

        // Execute transition within a DB transaction
        const waitData = waitTransition.schema
          ? waitTransition.schema.parse(pendingTransition.payload)
          : pendingTransition.payload;

        await this.executeTransition(
          ctx,
          proxy,
          waitTransition.methodName,
          waitTransition.to,
          waitData,
          workflowEntity,
          workflowName,
        );
      }
    }

    // Auto-transition loop
    while (true) {
      const currentPlace = ctx.getManager().getData('place');

      if (currentPlace === 'end') break;

      ctx.getManager().setData('nextPlace', undefined);

      const available = this.transitionResolverService.getAvailableTransitions(workflow, currentPlace);

      // Set available transitions (includes wait transitions for frontend visibility)
      const availableForMetadata = available.map((t) => ({
        id: t.methodName,
        from: currentPlace,
        to: t.to,
        trigger: t.wait ? ('manual' as const) : undefined,
      }));
      ctx.getManager().setData('availableTransitions', availableForMetadata);

      // Resolve next auto-transition
      const next = this.executionScope.run(ctx, () => {
        return this.transitionResolverService.resolveNextTransition(proxy, available, guards);
      });

      if (!next) break;

      // Set transition info on metadata (so ctx.runtime.transition works)
      ctx.getManager().setData('transition', {
        id: next.methodName,
        from: currentPlace,
        to: next.to,
        payload: null,
      });

      // Pre-transition persistence (committed state — recovery point if transition fails)
      if (workflowEntity) {
        await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
      }

      // Execute transition within a DB transaction
      const autoData = next.from === 'start' ? ctx.getArgs() : undefined;
      await this.executeTransition(ctx, proxy, next.methodName, next.to, autoData, workflowEntity, workflowName);
    }
  }

  /**
   * Wires @FrameworkService() properties on the workflow and wraps injected tools in proxies.
   * Tool proxies intercept call() for framework logic and state access for isolation.
   */
  private wireFrameworkServices(workflow: WorkflowInterface): void {
    // Wire and proxy each injected tool, replacing the reference on the raw workflow instance
    const toolNames = getBlockTools(workflow);
    for (const name of toolNames) {
      const tool = (workflow as Record<string, unknown>)[name] as object | undefined;
      if (tool) {
        const proxy = this.toolExecutionService.wireAndProxyTool(tool, name);
        (workflow as Record<string, unknown>)[name] = proxy;
      }
    }
  }
}
