import {Injectable} from "@nestjs/common";
import {StateMachineValidatorInterface} from "../interfaces/state-machine-validator.interface";
import {WorkflowState} from "../../persistence/entities/workflow-state.entity";
import {TransitionPayloadInterface} from "../interfaces/transition-payload.interface";
import {StateMachineValidator} from "../decorators/state-machine-validator.decorator";

@Injectable()
@StateMachineValidator({ priority: 0 })
export class InitialRunValidator implements StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: TransitionPayloadInterface[], workflowState: WorkflowState, options: Record<string, any>): { valid: boolean; reason: string | null; } {
        const isValid = pendingWorkflowTransitions.length === 0
            && workflowState.stateMachine.place !== 'initial';

        return { valid: isValid, reason: null }
    }
}
