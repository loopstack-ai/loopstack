import { Injectable, Logger } from '@nestjs/common';
import {
  RunContext,
  StateMachineValidatorResultInterface,
  WorkflowEntity,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockOutputMetadata,
  getBlockStateSchema,
} from '@loopstack/common';
import { WorkflowState, WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { ConfigTraceError, Processor } from '../../../common';
import { ExecutionContextManager, WorkflowExecutionContextManager } from '../../utils/execution-context-manager';
import { StateManager } from '../../utils/state/state-manager';
import { StateMachineProcessorService } from '../state-machine-processor.service';
import { StateMachineValidatorService } from '../state-machine-validator.service';
import { WorkflowStateService } from '../workflow-state.service';

@Injectable()
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineValidatorService: StateMachineValidatorService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  createCtx(
    workflow: WorkflowInterface,
    context: RunContext,
    validArgs: Record<string, unknown> | undefined,
    workflowEntity?: WorkflowEntity,
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
      hashRecord: workflowEntity?.hashRecord ?? null,
      tools: {},
      result: null,
    };

    const schema = getBlockStateSchema(workflow);
    const stateManager = new StateManager(schema, initialWorkflowData, workflowEntity?.history ?? null);
    return new ExecutionContextManager<any, any, WorkflowMetadataInterface>(workflow, context, validArgs, stateManager);
  }

  async process(
    workflow: WorkflowInterface,
    args: Record<string, unknown> | undefined,
    context: RunContext,
  ): Promise<WorkflowMetadataInterface> {
    let validArgs: Record<string, unknown> | undefined = undefined;
    if (workflow.validate) {
      validArgs = workflow.validate(args);
    } else {
      const schema = getBlockArgsSchema(workflow);
      validArgs = schema ? (schema.parse(args) as Record<string, unknown> | undefined) : args;
    }

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

      ctx = this.createCtx(workflow, context, validArgs, workflowEntity);

      const validatorResult = this.stateMachineValidatorService.validate(workflowEntity, ctx);

      pendingTransition =
        validatorResult.valid && ctx.getContext().payload?.transition?.workflowId === ctx.getContext().workflowId
          ? ctx.getContext().payload?.transition
          : undefined;

      if (validatorResult.valid && !pendingTransition) {
        this.logger.debug('Skipping processing since state is processed still valid.');
        return ctx.getData();
      }

      this.initStateMachine(ctx, validatorResult);
    }

    this.logger.debug(`Process state machine for workflow ${workflow.constructor.name}`);

    try {
      for await (const yieldedCtx of this.stateMachineProcessorService.processStateMachine(
        ctx,
        pendingTransition ? [pendingTransition] : [],
      )) {
        if (workflowEntity) {
          await this.workflowStateService.saveExecutionState(workflowEntity, yieldedCtx);
        }
        ctx = yieldedCtx;
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(new ConfigTraceError(error, ctx.getInstance()));
      ctx.getManager().setData('errorMessage', error.message);
      ctx.getManager().setData('hasError', true);
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

    if (workflowEntity) {
      await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
    }
    return ctx.getData();
  }

  initStateMachine(ctx: WorkflowExecutionContextManager, validation: StateMachineValidatorResultInterface): void {
    ctx.getManager().setData('status', WorkflowStateEnum.Running);

    if (!validation.valid) {
      ctx.getManager().setData('hashRecord', {
        ...(ctx.getManager().getData('hashRecord') ?? {}),
        ...validation.hashRecordUpdates,
      });

      ctx.getManager().setData('result', null);

      // add invalidation transition if not at start place
      const currentPlace: string = ctx.getManager().getData('place');
      if (currentPlace !== 'start') {
        ctx.getManager().setData('place', 'start');

        ctx.getManager().setData('transition', {
          id: 'invalidation',
          from: currentPlace,
          to: 'start',
          payload: {},
        });

        ctx.getManager().checkpoint();
      }
    }
  }
}
