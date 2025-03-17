import { TransitionContextInterface } from './transition-context.interface';
import { ContextInterface } from './context.interface';
import { WorkflowStateContextInterface } from './workflow-state-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities';
import { ZodType } from 'zod';
import { ServiceWithSchemaInterface } from './service-with-schema.interface';

export interface ActionExecutePayload {
  workflowContext: ContextInterface;
  workflowStateContext: WorkflowStateContextInterface;
  transitionContext: TransitionContextInterface;
  workflow: WorkflowEntity;
  props: any;
}

export interface StateMachineActionInterface extends ServiceWithSchemaInterface {
  execute(payload: ActionExecutePayload): Promise<TransitionResultInterface>;
}
