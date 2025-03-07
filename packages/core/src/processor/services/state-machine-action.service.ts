import { Injectable } from '@nestjs/common';
import { WorkflowObserverConfigInterface } from '@loopstack/shared';
import { ContextInterface } from '../interfaces/context.interface';
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { StateMachineActionRegistry } from './state-machine-action-registry.service';
import { ActionCollectionService } from '../../configuration/services/action-collection.service';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
export class StateMachineActionService {
  constructor(
    private readonly stateMachineActionRegistry: StateMachineActionRegistry,
    private readonly actionCollectionService: ActionCollectionService,
  ) {}

  async executeAction(
    observer: WorkflowObserverConfigInterface,
    workflowContext: ContextInterface,
    workflowStateContext: WorkflowStateContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
  ): Promise<TransitionResultInterface> {
    const actionConfig = this.actionCollectionService.getByName(
      observer.action,
    );
    if (!actionConfig) {
      throw new Error(`Config for action ${observer.action} not found.`);
    }

    const actionInstance = this.stateMachineActionRegistry.getActionByName(
      actionConfig.service,
    );
    if (!actionInstance) {
      throw new Error(`Action service ${actionConfig.service} not found.`);
    }

    console.log(`Executing action ${actionConfig.service}`);

    const props = actionConfig.props;
    // todo parse action props from actionConfig with function call

    return actionInstance.execute({
      workflowContext,
      workflowStateContext,
      transitionContext,
      workflow,
      props,
    });
  }
}
