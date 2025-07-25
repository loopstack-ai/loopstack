import { Injectable, Logger } from '@nestjs/common';
import { StateMachineProcessorService } from './state-machine-processor.service';
import {
  ContextInterface,
  ConfigElement,
  WorkflowState,
  WorkflowType,
} from '@loopstack/shared';
import { WorkflowStateService } from './workflow-state.service';
import { StateMachineConfigService } from './state-machine-config.service';
import { ContextService } from '../../common';

@Injectable()
export class WorkflowProcessorService {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly stateMachineConfigService: StateMachineConfigService,
    private readonly contextService: ContextService,
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineProcessorService: StateMachineProcessorService,
  ) {}

  async runStateMachineType(
    configElement: ConfigElement<WorkflowType>,
    context: ContextInterface,
  ) {

    const mergedConfigElement =
      this.stateMachineConfigService.getConfig(configElement);

    this.contextService.addIncludes(context, mergedConfigElement.importMap);

    // create or load state if needed
    const currentWorkflow = await this.workflowStateService.getWorkflowState(
      mergedConfigElement,
      context,
    );

    const workflow =
      await this.stateMachineProcessorService.processStateMachine(
        context,
        currentWorkflow,
        mergedConfigElement,
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
