import { TransitionContextInterface } from './transition-context.interface';
import { ContextInterface } from './context.interface';
import { WorkflowStateContextInterface } from './workflow-state-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities';
import { ZodType } from 'zod';

export interface ActionExecutePayload {
  workflowContext: ContextInterface;
  workflowStateContext: WorkflowStateContextInterface;
  transitionContext: TransitionContextInterface;
  workflow: WorkflowEntity;
  props: any;
}

export interface StateMachineActionInterface {
  propsSchema: ZodType | undefined;
  execute(payload: ActionExecutePayload): Promise<TransitionResultInterface>;
}
