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
import { ConfigTraceError, Processor } from '../../../common';
import { ExecutionContextManager } from '../../utils/execution-context-manager';
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

    const workflowEntity = await this.workflowStateService.getWorkflowState(workflow, context);
    context.workflowId = workflowEntity.id;

    const initialWorkflowData: WorkflowMetadataInterface = {
      error: false,
      stop: false,
      status: workflowEntity.status,
      availableTransitions: [],
      persistenceState: {
        documentsUpdated: false,
      },
      documents: workflowEntity.documents,
      place: workflowEntity.place,
      tools: {},
    };

    const schema = getBlockStateSchema(workflow);
    const stateManager = new StateManager(schema, initialWorkflowData, workflowEntity.history);
    let ctx = new ExecutionContextManager<any, any, WorkflowMetadataInterface>(
      workflow,
      context,
      validArgs,
      stateManager,
    );

    const validatorResult = this.stateMachineValidatorService.validate(workflowEntity, ctx);

    const pendingTransition =
      validatorResult.valid && ctx.getContext().payload?.transition?.workflowId === ctx.getContext().workflowId
        ? ctx.getContext().payload?.transition
        : undefined;

    if (validatorResult.valid && !pendingTransition) {
      this.logger.debug('Skipping processing since state is processed still valid.');
      return ctx.getData();
    }

    this.logger.debug(`Process state machine for workflow ${workflow.constructor.name}`);

    this.initStateMachine(ctx, workflowEntity, validatorResult);

    try {
      ctx = await this.stateMachineProcessorService.processStateMachine(
        workflowEntity,
        ctx,
        pendingTransition ? [pendingTransition] : [],
      );
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(new ConfigTraceError(error, ctx.getInstance()));
      ctx.getManager().setData('errorMessage', error.message);
      ctx.getManager().setData('error', true);
    }

    if (ctx.getManager().getData('error')) {
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

    await this.workflowStateService.saveExecutionState(workflowEntity, ctx);
    return ctx.getData();
  }

  initStateMachine(
    ctx: ExecutionContextManager,
    workflowEntity: WorkflowEntity,
    validation: StateMachineValidatorResultInterface,
  ): void {
    ctx.getManager().setData('status', WorkflowStateEnum.Running);
    workflowEntity.status = ctx.getManager().getData('status') as WorkflowState;

    if (!validation.valid) {
      workflowEntity.hashRecord = {
        ...(workflowEntity.hashRecord ?? {}),
        ...validation.hashRecordUpdates,
      };

      ctx.getManager().setData('result', null);
      workflowEntity.result = ctx.getManager().getData('result') as Record<string, unknown> | null;

      // add invalidation transition if not at start place
      if (ctx.getManager().getData('place') !== 'start') {
        ctx.getManager().setData('place', 'start');

        ctx.getManager().setData('transition', {
          id: 'invalidation',
          from: workflowEntity.place,
          to: 'start',
          payload: {},
        });

        ctx.getManager().checkpoint();
      }
    }
  }
}
