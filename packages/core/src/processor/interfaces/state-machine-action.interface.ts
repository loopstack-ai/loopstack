import { TransitionContextInterface } from './transition-context.interface';
import { WorkflowStateContextInterface } from './workflow-state-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { ServiceWithSchemaInterface } from './service-with-schema.interface';
import { ProcessStateInterface } from './process-state.interface';

export interface ActionExecutePayload extends ProcessStateInterface {
  workflowStateContext: WorkflowStateContextInterface;
  transitionContext: TransitionContextInterface;
  props: any;
}

export interface StateMachineActionInterface extends ServiceWithSchemaInterface {
  execute(payload: ActionExecutePayload): Promise<TransitionResultInterface>;
}
