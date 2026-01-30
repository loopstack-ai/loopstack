import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StateMachineValidatorResultInterface, getBlockStateSchema } from '@loopstack/common';
import { WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { BlockExecutionContextDto, Processor } from '../../../common';
import { WorkflowBase } from '../../abstract';
import { ExecutionContext } from '../../dtos/execution-context';
import { WorkflowExecution } from '../../interfaces/workflow-execution.interface';
import { WorkflowMementoData } from '../../interfaces/workflow-memento-data.interfate';
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

  async process(workflow: WorkflowBase, args: any, context: BlockExecutionContextDto): Promise<WorkflowExecution> {
    const validArgs = workflow.validate(args) as Record<string, unknown> | undefined;

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

    this.logger.debug(`Process state machine for workflow ${workflow.name}`);

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
