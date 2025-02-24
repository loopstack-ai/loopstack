import {Injectable} from '@nestjs/common';
import { WorkflowStateMachineConfigInterface } from '@loopstack/shared';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { StateMachineConfigService } from './state-machine-config.service';
import { WorkflowStateService } from '../../persistence/services/workflow-state.service';
import { WorkflowState } from '../../persistence/entities/workflow-state.entity';
import {StateMachineValidatorRegistry} from "../validators/state-machine-validator.registry";

@Injectable()
export class StateMachineProcessorService {
  constructor(
    private workflowConfigService: StateMachineConfigService,
    private workflowStateService: WorkflowStateService,
    private stateMachineValidatorRegistry: StateMachineValidatorRegistry
  ) {}

  async getWorkflowState(
    workflowName: string,
    context: ContextInterface,
  ): Promise<WorkflowState> {
    let workflowState = await this.workflowStateService.loadByIdentity(
      context.projectId,
      workflowName,
      context.namespaces,
    );

    if (workflowState) {
      return workflowState;
    }

    return this.workflowStateService.createState({
      projectId: context.projectId,
      userId: context.userId,
      namespaces: context.namespaces,
      name: workflowName,
    });
  }

  canSkipRun(pendingWorkflowTransitions: any[], workflowState: any): boolean {
    return this.stateMachineValidatorRegistry.getValidators().every(validator => validator.validate(pendingWorkflowTransitions, workflowState));
  }

  async runStateMachine(
    workflowName: string,
    stateMachineConfig: WorkflowStateMachineConfigInterface,
    context: ContextInterface,
  ) {
    let result: { context: ContextInterface } = { context };
    const workflowState = await this.getWorkflowState(workflowName, context);

    const pendingWorkflowTransitions = context.transitions.filter(
        (t) => t.workflowStateId === workflowState.id,
    );

    if (this.canSkipRun(pendingWorkflowTransitions, workflowState)) {
      return result;
    }

    const { transitions, observers } =
        this.workflowConfigService.getStateMachineFlatConfig(stateMachineConfig);

    //todo continue here...

    return result;
  }
}
