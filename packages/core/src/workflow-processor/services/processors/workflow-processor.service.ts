import { Injectable, Logger } from '@nestjs/common';
import { ProcessorFactory } from '../processor.factory';
import { Workflow } from '../../abstract';
import {
  StateMachineValidatorResultInterface,
  WorkflowEntity,
} from '@loopstack/common';
import { HistoryTransition } from '@loopstack/contracts/types';
import { WorkflowState } from '@loopstack/contracts/enums';

import { BlockHelperService } from '../block-helper.service';
import { WorkflowStateService } from '../workflow-state.service';
import { StateMachineValidatorService } from '../state-machine-validator.service';
import { StateMachineProcessorService } from '../state-machine-processor.service';
import { Processor } from '../../../common';

@Injectable()
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly blockHelperService: BlockHelperService,
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineValidatorService: StateMachineValidatorService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async process(block: Workflow, factory: ProcessorFactory): Promise<Workflow> {
    // create or load state if needed
    const workflowEntity =
      await this.workflowStateService.getWorkflowState(block);
    block.state = this.blockHelperService.initBlockState(workflowEntity);

    this.blockHelperService.populateBlockInputProperties(
      block,
      workflowEntity.inputData,
    );

    const validatorResult = this.stateMachineValidatorService.validate(
      workflowEntity,
      block.args,
    );

    const pendingTransition =
      validatorResult.valid &&
      block.ctx.payload?.transition?.workflowId === workflowEntity.id
        ? block.ctx.payload?.transition
        : undefined;

    if (validatorResult.valid && !pendingTransition) {
      this.logger.debug(
        'Skipping processing since state is processed still valid.',
      );
      return block;
    }

    this.logger.debug(
      `Process state machine for workflow ${workflowEntity!.blockName}`,
    );

    this.initStateMachine(block, workflowEntity, validatorResult);

    return this.stateMachineProcessorService.processStateMachine(
      workflowEntity,
      block,
      pendingTransition ? [pendingTransition] : [],
      factory,
    );
  }

  initStateMachine(
    block: Workflow,
    workflow: WorkflowEntity,
    validation: StateMachineValidatorResultInterface,
  ): void {
    workflow.status = WorkflowState.Running;

    if (!validation.valid) {
      workflow.hashRecord = {
        ...(workflow?.hashRecord ?? {}),
        ...validation.hashRecordUpdates,
      };

      // reset workflow to "start" if there are invalidation reasons
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'start',
      };

      block.state.place = initialTransition.to;
      block.state.history.push(initialTransition);
    }
  }
}
