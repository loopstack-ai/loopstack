import { Injectable, Logger } from '@nestjs/common';
import {
  BaseDocument,
  BaseTool,
  BaseWorkflow,
  LaunchWorkflowOptions,
  RunContext,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockDocuments,
  getBlockOptions,
  getBlockOutputMetadata,
  getBlockTemplatesPropertyName,
  getBlockTools,
  getBlockWorkflows,
  getGuardMetadataMap,
} from '@loopstack/common';
import { WorkflowState, WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { ConfigTraceError, Processor } from '../../../common';
import {
  ExecutionContextManager,
  ExecutionScope,
  WorkflowExecutionContextManager,
  WorkflowTemplatesImpl,
} from '../../utils';
import { CheckpointState, StateManager } from '../../utils/state/state-manager';
import { DocumentCreateOptions, DocumentPersistenceService } from '../document-persistence.service';
import { ToolExecutionService } from '../tool-execution.service';
import { TransitionResolverService } from '../transition-resolver.service';
import { WorkflowMemoryMonitorService } from '../workflow-memory-monitor.service';
import { WorkflowOrchestrationService } from '../workflow-orchestration.service';
import { WorkflowStateService } from '../workflow-state.service';

/** Invoke a named method on a workflow proxy (transition or guard method) */
function invokeWorkflowMethod(proxy: WorkflowInterface, methodName: string): Promise<void> {
  const method = (proxy as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') {
    throw new Error(`Method '${methodName}' not found on workflow ${proxy.constructor.name}`);
  }
  return (method as () => Promise<void>).call(proxy);
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
    private readonly documentPersistenceService: DocumentPersistenceService,
    private readonly workflowOrchestrationService: WorkflowOrchestrationService,
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
      workflowEntity = await this.workflowStateService.getWorkflowState(workflow, context);
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

    // Wire _run() on injected tools and _create() on injected documents
    // so the proxy can redirect .run() → ._run() and .create() → ._create()
    this.wireToolsAndDocuments(workflow);

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
      const outputMetadata = getBlockOutputMetadata(ctx.getInstance());
      if (outputMetadata) {
        const instance = ctx.getInstance() as Record<string | symbol, (...args: any[]) => unknown>;
        const result = instance[outputMetadata.name]();
        ctx
          .getManager()
          .setData(
            'result',
            (outputMetadata.schema ? outputMetadata.schema.parse(result) : result) as Record<string, unknown>,
          );
      }
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

        // Pre-transition persistence
        if (workflowEntity) {
          await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
        }

        // Execute transition method
        this.logger.debug(`Applying transition: ${waitTransition.methodName} (${currentPlace} → ${waitTransition.to})`);
        await this.executionScope.run(ctx, () => {
          return invokeWorkflowMethod(proxy, waitTransition.methodName);
        });

        // Advance place + persist
        ctx.getManager().setData('place', waitTransition.to);
        ctx.getManager().checkpoint();
        this.memoryMonitor.logTransition(workflowName, waitTransition.methodName, ctx);

        if (workflowEntity) {
          await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
        }
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

      this.logger.debug(`Applying transition: ${next.methodName} (${next.from} → ${next.to})`);

      // Set transition info on metadata (so this.runtime.transition works)
      ctx.getManager().setData('transition', {
        id: next.methodName,
        from: currentPlace,
        to: next.to,
        payload: null,
      });

      // Pre-transition persistence (save "transition selected" state before execution)
      if (workflowEntity) {
        await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
      }

      // Execute transition method within ExecutionScope
      await this.executionScope.run(ctx, () => {
        return invokeWorkflowMethod(proxy, next.methodName);
      });

      // Advance place + persist
      ctx.getManager().setData('place', next.to);
      ctx.getManager().checkpoint();

      this.memoryMonitor.logTransition(workflowName, next.methodName, ctx);

      if (workflowEntity) {
        await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
      }
    }
  }

  /**
   * Wires _run() on injected tools, _create() on injected documents,
   * and WorkflowTemplates on @InjectTemplates() property.
   */
  private wireToolsAndDocuments(workflow: WorkflowInterface): void {
    // Wire tools: proxy redirects .run() → ._run() → ToolExecutionService
    const toolNames = getBlockTools(workflow);
    for (const name of toolNames) {
      const tool = (workflow as Record<string, unknown>)[name] as BaseTool | undefined;
      if (tool) {
        const toolExecutionService = this.toolExecutionService;
        tool._run = function (args: Record<string, unknown>) {
          return toolExecutionService.execute(tool, args);
        };

        // Wire documents inside tools so they work outside the tool proxy
        // (e.g. when complete() is called directly by UpdateToolResult)
        const toolDocNames = getBlockDocuments(tool.constructor);
        for (const docName of toolDocNames) {
          const doc = (tool as unknown as Record<string, unknown>)[docName] as BaseDocument | undefined;
          if (doc) {
            const documentPersistenceService = this.documentPersistenceService;
            const blockName = docName;
            doc._create = function (options: DocumentCreateOptions) {
              return Promise.resolve(documentPersistenceService.create(blockName, doc, options));
            };
          }
        }
      }
    }

    // Wire documents: proxy redirects .create() → ._create() → DocumentPersistenceService
    const docNames = getBlockDocuments(workflow);
    for (const name of docNames) {
      const doc = (workflow as Record<string, unknown>)[name] as BaseDocument | undefined;
      if (doc) {
        const documentPersistenceService = this.documentPersistenceService;
        const blockName = name;
        doc._create = function (options: DocumentCreateOptions) {
          return Promise.resolve(documentPersistenceService.create(blockName, doc, options));
        };
      }
    }

    // Wire sub-workflows: proxy redirects .run() → ._run() → WorkflowOrchestrationService
    const workflowNames = getBlockWorkflows(workflow);
    for (const name of workflowNames) {
      const subWorkflow = (workflow as Record<string, unknown>)[name] as BaseWorkflow | undefined;
      if (subWorkflow) {
        const orchestrationService = this.workflowOrchestrationService;
        const blockName = name;
        subWorkflow._run = function (options: LaunchWorkflowOptions) {
          return orchestrationService.launch(blockName, subWorkflow, options);
        };
      }
    }

    // Wire templates: create WorkflowTemplatesImpl from @Workflow({ templates }) option
    const templatesPropName = getBlockTemplatesPropertyName(workflow);
    if (templatesPropName) {
      const options = getBlockOptions(workflow);
      const templatePaths = options?.templates;
      if (templatePaths) {
        (workflow as Record<string, unknown>)[templatesPropName] = new WorkflowTemplatesImpl(templatePaths);
      }
    }
  }
}
