import { Injectable, Logger } from '@nestjs/common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import { ContextInterface, WorkflowState, WorkflowType } from '@loopstack/shared';
import { WorkflowStateService } from './workflow-state.service';

@Injectable()
export class WorkflowProcessorService {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private workflowConfigService: WorkflowStateService,
    private stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async runStateMachineType(config: WorkflowType, context: ContextInterface) {
    // create or load state if needed
    const currentWorkflow = await this.workflowConfigService.getWorkflowState(
      config,
      context,
    );

    const workflow =
      await this.stateMachineProcessorService.processStateMachine(
        context,
        currentWorkflow,
        config,
      );

    if (workflow.status === WorkflowState.Failed) {
      context.error = true;
    }

    if (context.error || workflow.place !== 'end') {
      context.stop = true;
    } else {
      // update the context if changed in workflow
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
