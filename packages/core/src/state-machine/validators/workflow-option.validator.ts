import {Injectable} from "@nestjs/common";
import {StateMachineValidatorInterface} from "../interfaces/state-machine-validator.interface";
import {generateObjectFingerprint} from "@loopstack/shared/dist/utils/object-fingerprint.util";
import {WorkflowState} from "../../persistence/entities/workflow-state.entity";
import {TransitionPayloadInterface} from "../interfaces/transition-payload.interface";
import {StateMachineValidator} from "../decorators/state-machine-validator.decorator";

@Injectable()
@StateMachineValidator({ priority: 100 })
export class WorkflowOptionValidator implements StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: TransitionPayloadInterface[], workflowState: WorkflowState, options: Record<string, any>): { valid: boolean; reason: string | null; } {

        const optionsHash = generateObjectFingerprint(options);

        console.log(
            `Checking option invalidation: ${(workflowState.optionsHash !== optionsHash).toString()}`,
        );

        if (workflowState.optionsHash !== optionsHash) {
            return { valid: false, reason: 'options' }
        }

        return { valid: true, reason: null }
    }
}
