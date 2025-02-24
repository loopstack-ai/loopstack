import {Injectable} from "@nestjs/common";
import {StateMachineValidator} from "../decorators/run-validation.decorator";
import {StateMachineValidatorInterface} from "../interfaces/state-machine-validator.interface";

@Injectable()
@StateMachineValidator()
export class DefaultSkipRunValidator implements StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: any[], workflowState: any): { valid: boolean; reason: string | null; } {
        const isValid = pendingWorkflowTransitions.length === 0
            && workflowState.stateMachine.place !== 'initial';

        return { valid: isValid, reason: null }
    }
}
