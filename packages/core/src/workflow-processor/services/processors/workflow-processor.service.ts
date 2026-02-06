import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  BlockExecutionContextDto,
  ExecutionContext,
  StateMachineValidatorResultInterface,
  WorkflowExecution,
  WorkflowInterface,
  WorkflowMementoData,
  getBlockArgsSchema,
  getBlockStateSchema,
} from '@loopstack/common';
import { WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { Processor } from '../../../common';
import { StateMachineProcessorService } from '../state-machine-processor.service';
import { StateMachineValidatorService } from '../state-machine-validator.service';
import { WorkflowStateCaretaker } from '../state/workflow-state-caretaker';
import { WorkflowState } from '../state/workflow.state';
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
    context: BlockExecutionContextDto,
  ): Promise<WorkflowExecution> {
    let validArgs: Record<string, unknown> | undefined = undefined;
    if (workflow.validate) {
      validArgs = workflow.validate(args);
    } else {
      const schema = getBlockArgsSchema(workflow);
      validArgs = schema ? (schema.parse(args) as Record<string, unknown> | undefined) : args;
    }

    const workflowEntity = await this.workflowStateService.getWorkflowState(workflow, context);

    context.workflowId = workflowEntity.id;

    const workflowStateDataSchema = getBlockStateSchema(workflow) ?? z.object({});

    const workflowStateCaretaker = WorkflowStateCaretaker.deserialize(
      (workflowEntity.history ?? []) as WorkflowMementoData<z.infer<typeof workflowStateDataSchema>>[],
      workflowStateDataSchema,
    );

    const executionContext = new ExecutionContext({
      error: false,
      stop: false,
      transition: undefined,
      availableTransitions: [],
      persistenceState: {
        documentsUpdated: false,
      },
    });

    const workflowState = new WorkflowState(
      workflowStateDataSchema,
      workflowStateCaretaker,
      {},
      {
        documents: workflowEntity.documents,
        place: workflowEntity.place,
        tools: {},
      },
    );

    const ctx = {
      context,
      state: workflowState,
      runtime: executionContext,
      entity: workflowEntity,
    } as WorkflowExecution;

    const validatorResult = this.stateMachineValidatorService.validate(ctx.entity, validArgs);

    const pendingTransition =
      validatorResult.valid && ctx.context.payload?.transition?.workflowId === ctx.entity.id
        ? ctx.context.payload?.transition
        : undefined;

    if (validatorResult.valid && !pendingTransition) {
      this.logger.debug('Skipping processing since state is processed still valid.');
      return ctx;
    }

    this.logger.debug(`Process state machine for workflow ${workflow.constructor.name}`);

    this.initStateMachine(ctx, validatorResult);

    return this.stateMachineProcessorService.processStateMachine(
      workflow,
      validArgs,
      ctx,
      pendingTransition ? [pendingTransition] : [],
    );
  }

  initStateMachine(ctx: WorkflowExecution, validation: StateMachineValidatorResultInterface): void {
    ctx.entity.status = WorkflowStateEnum.Running;

    if (!validation.valid) {
      ctx.entity.hashRecord = {
        ...(ctx.entity?.hashRecord ?? {}),
        ...validation.hashRecordUpdates,
      };

      ctx.entity.result = null;

      // add invalidation transition if not at start place
      if (ctx.state.getMetadata('place') !== 'start') {
        ctx.state.setMetadata('place', 'start');

        ctx.state.setMetadata('transition', {
          transition: 'invalidation',
          from: ctx.entity.place,
          to: 'start',
        });

        ctx.state.checkpoint();
      }
    }
  }
}
