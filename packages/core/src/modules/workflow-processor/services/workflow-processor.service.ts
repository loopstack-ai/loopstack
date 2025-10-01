import { Injectable, Logger } from '@nestjs/common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import {
  ContextInterface,
  WorkflowState,
} from '@loopstack/shared';
import { WorkflowStateService } from './workflow-state.service';
import { Block } from '../../configuration';

@Injectable()
export class WorkflowProcessorService {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async runStateMachineType(
    block: Block,
    args: any,
    context: ContextInterface,
  ) {
    // create or load state if needed
    const currentWorkflow = await this.workflowStateService.getWorkflowState(
      block,
      context,
    );

    const workflow =
      await this.stateMachineProcessorService.processStateMachine(
        context,
        currentWorkflow,
        block,
        args,
      );

    if (workflow.status === WorkflowState.Failed) {
      context.error = true;
    }

    if (context.error || workflow.place !== 'end') {
      context.stop = true;
    } else {
      // update the context if changed in workflow (required for completed/loaded workflows)
      if (workflow.contextVariables) {
        context.variables = {
          ...context.variables,
          ...workflow.contextVariables,
        };
      }
    }

    return context;
  }
}
