import {Injectable} from "@nestjs/common";
import {StateMachineAction} from "../decorators/state-machine-observer.decorator";
import {StateMachineActionInterface} from "../interfaces/state-machine-action.interface";
import { WorkflowState } from "src/persistence/entities/workflow-state.entity";
import { ContextInterface } from "src/processor/interfaces/context.interface";
import { StateMachineContextInterface } from "../interfaces/state-machine-context.interface";
import { TransitionContextInterface } from "../interfaces/transition-context.interface";
import { TransitionResultInterface } from "../interfaces/transition-result.interface";

@Injectable()
@StateMachineAction()
export class PromptAction implements StateMachineActionInterface {
    async execute(workflowContext: ContextInterface, stateMachineContext: StateMachineContextInterface, transitionContext: TransitionContextInterface, state: WorkflowState, props: any): Promise<TransitionResultInterface> {
        console.log('PromptAction')
        return {}
    }
}