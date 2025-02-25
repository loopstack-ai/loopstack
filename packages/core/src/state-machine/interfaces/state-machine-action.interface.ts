import { TransitionContextInterface } from './transition-context.interface';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { StateMachineContextInterface } from './state-machine-context.interface';
import { TransitionResultInterface } from './transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface StateMachineActionInterface {
  execute(
    workflowContext: ContextInterface,
    stateMachineContext: StateMachineContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
    props: any,
  ): Promise<TransitionResultInterface>;
}
