import {WorkflowState} from "../../persistence/entities/workflow-state.entity";

export interface TransitionResultInterface {
    state?: WorkflowState;
    nextPlace?: string | undefined;
}