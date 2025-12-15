import { Injectable, Logger } from '@nestjs/common';
import { WorkflowBase } from '../../abstract';
import {
  StateMachineValidatorResultInterface,
} from '@loopstack/common';
import { WorkflowState as WorkflowStateEnum } from '@loopstack/contracts/enums';
import { WorkflowStateService } from '../workflow-state.service';
import { StateMachineValidatorService } from '../state-machine-validator.service';
import { StateMachineProcessorService } from '../state-machine-processor.service';
import { BlockExecutionContextDto, Processor } from '../../../common';
import { WorkflowState } from '../state/workflow.state';
import { z } from 'zod';
import { WorkflowStateCaretaker } from '../state/workflow-state-caretaker';
import { ExecutionContext } from '../../dtos/execution-context';
import { WorkflowExecution } from '../../interfaces/workflow-execution.interface';

@Injectable()
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineValidatorService: StateMachineValidatorService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async process(workflow: WorkflowBase, args: any, context: BlockExecutionContextDto): Promise<WorkflowExecution> {
    const validArgs = workflow.validate(args);

    const workflowEntity =
      await this.workflowStateService.getWorkflowState(workflow, context);

    context.workflowId = workflowEntity.id;

    const workflowStateDataSchema = workflow.stateSchema ? workflow.stateSchema : z.object({});

    const workflowStateCaretaker = WorkflowStateCaretaker.deserialize(workflowEntity.history ?? [], workflowStateDataSchema);

    const executionContext = new ExecutionContext({
      error: false,
      stop: false,
      transition: undefined,
      availableTransitions: [],
      persistenceState: {
        documentsUpdated: false,
      },
    })

    const workflowState = new WorkflowState(
      workflowStateDataSchema,
      workflowStateCaretaker,
      {},
      {
        documents: workflowEntity.documents,
        place: workflowEntity.place,
        tools: {}
      }
    );

    const ctx = {
      context,
      state: workflowState,
      runtime: executionContext,
      entity: workflowEntity,
    } as WorkflowExecution;

    const validatorResult = this.stateMachineValidatorService.validate(
      ctx.entity,
      validArgs,
    );

    const pendingTransition =
      validatorResult.valid &&
      ctx.context.payload?.transition?.workflowId === ctx.entity.id
        ? ctx.context.payload?.transition
        : undefined;

    if (validatorResult.valid && !pendingTransition) {
      this.logger.debug(
        'Skipping processing since state is processed still valid.',
      );
      return ctx;
    }

    this.logger.debug(
      `Process state machine for workflow ${workflow.name}`,
    );

    this.initStateMachine(ctx, validatorResult);

    return this.stateMachineProcessorService.processStateMachine(
      workflow,
      validArgs,
      ctx,
      pendingTransition ? [pendingTransition] : [],
    );
  }

  initStateMachine(
    ctx: WorkflowExecution,
    validation: StateMachineValidatorResultInterface,
  ): void {
    ctx.entity.status = WorkflowStateEnum.Running;

    if (!validation.valid) {
      ctx.entity.hashRecord = {
        ...(ctx.entity?.hashRecord ?? {}),
        ...validation.hashRecordUpdates,
      };

      // add invalidation transition if not at start place
      if (ctx.state.getMetadata('place') !== 'start') {
        ctx.state.setMetadata('place', 'start');

        ctx.state.setMetadata('transition', {
          transition: 'invalidation',
          from: ctx.entity.place,
          to: 'start'
        });

        ctx.state.checkpoint();
      }
    }
  }
}
