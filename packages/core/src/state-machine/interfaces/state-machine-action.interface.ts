import { TransitionContextInterface } from './transition-context.interface';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowStateContextInterface } from './workflow-state-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface StateMachineActionInterface {
  execute(
    workflowContext: ContextInterface,
    stateMachineContext: WorkflowStateContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
    props: any,
  ): Promise<TransitionResultInterface>;
}
