import { TransitionContextInterface } from './transition-context.interface';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowStateContextInterface } from './workflow-state-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface ActionExecutePayload {
  workflowContext: ContextInterface;
  workflowStateContext: WorkflowStateContextInterface;
  transitionContext: TransitionContextInterface;
  workflow: WorkflowEntity;
  props: any;
}

export interface StateMachineActionInterface {
  execute(payload: ActionExecutePayload): Promise<TransitionResultInterface>;
}
