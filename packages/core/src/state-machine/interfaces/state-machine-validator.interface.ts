import {WorkflowState} from "../../persistence/entities/workflow-state.entity";
import {TransitionPayloadInterface} from "./transition-payload.interface";

export interface StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: TransitionPayloadInterface[], workflowState: WorkflowState, options: Record<string, any>): { valid: boolean; reason: string | null; };
}
