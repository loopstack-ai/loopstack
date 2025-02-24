import {TransitionContextInterface} from "./transition-context.interface";
import {ContextInterface} from "../../processor/interfaces/context.interface";
import {StateMachineContextInterface} from "./state-machine-context.interface";
import {WorkflowState} from "../../persistence/entities/workflow-state.entity";
import {TransitionResultInterface} from "./transition-result.interface";

export interface StateMachineActionInterface {
    execute(workflowContext: ContextInterface, stateMachineContext: StateMachineContextInterface, transitionContext: TransitionContextInterface, state: WorkflowState, props: any): Promise<TransitionResultInterface>;
}
