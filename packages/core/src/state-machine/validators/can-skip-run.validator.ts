import {Injectable} from "@nestjs/common";
import {StateMachineValidator} from "../decorators/run-validation.decorator";
import {StateMachineValidatorInterface} from "../../processor/interfaces/state-machine-validator.interface";

@Injectable()
@StateMachineValidator()
export class DefaultSkipRunValidator implements StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: any[], workflowState: any): boolean {
        return pendingWorkflowTransitions.length === 0
            && workflowState.stateMachine.place !== 'initial'
    }
}
