import { Injectable, Logger } from '@nestjs/common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import { WorkflowStateService } from './workflow-state.service';
import { Workflow } from '../abstract';

@Injectable()
export class WorkflowProcessorService {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async runStateMachineType(
    block: Workflow,
    args: any,
  ): Promise<Workflow> {
    // create or load state if needed
    const currentWorkflow = await this.workflowStateService.getWorkflowState(block);

    block.initWorkflow(
      args,
      currentWorkflow.data,
    );

    const result =
      await this.stateMachineProcessorService.processStateMachine(
        currentWorkflow,
        block,
      );

    if (false === result) {
      return block;
    }


    // todo: use blockInstance as primary data transfer object for state machine temporary states,
    //   make getter functions available to template expressions
    //   or directly call them via call function syntax as tool alternative (not sure if this is good since it is redundant with tool calls)
    //     however: getter functions probably dont need dependency injection?

    // updatedBlockInstance.researchResult = 'test123';

    // export the block state and assign to persistent workflow
    // workflow.blockState = this.serviceStateFactory.exportState(updatedBlockInstance);
    // await this.workflowStateService.saveWorkflow(workflow);

    // todo: apply changes to block?
    return result;
  }
}
