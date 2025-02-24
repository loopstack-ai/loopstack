import {Injectable} from "@nestjs/common";
import {WorkflowObserverConfigInterface} from "@loopstack/shared";
import {ContextInterface} from "../../processor/interfaces/context.interface";
import {StateMachineContextInterface} from "../interfaces/state-machine-context.interface";
import {TransitionContextInterface} from "../interfaces/transition-context.interface";
import {WorkflowState} from "../../persistence/entities/workflow-state.entity";
import {TransitionResultInterface} from "../interfaces/transition-result.interface";
import {StateMachineActionRegistry} from "../registry/state-machine-action-registry.service";
import {ActionCollectionService} from "../../configuration/services/action-collection.service";

@Injectable()
export class StateMachineActionService {

    constructor(
        private readonly stateMachineActionRegistry: StateMachineActionRegistry,
        private readonly actionCollectionService: ActionCollectionService,
    ) {}

    async executeAction(
        observer: WorkflowObserverConfigInterface,
        workflowContext: ContextInterface,
        stateMachineContext: StateMachineContextInterface,
        transitionContext: TransitionContextInterface,
        state: WorkflowState,
    ): Promise<TransitionResultInterface> {

        const actionConfig = this.actionCollectionService.getByName(observer.action);
        if (!actionConfig) {
            throw new Error(`Config for action ${observer.action} not found.`);
        }

        const actionInstance = this.stateMachineActionRegistry.getActionByName(actionConfig.service);
        if (!actionInstance) {
            throw new Error(`Action service ${actionConfig.service} not found.`);
        }

        console.log(`Executing action ${actionConfig.service}`)

        const props = {} // todo action props from actionConfig

        return actionInstance.execute(workflowContext, stateMachineContext, transitionContext, state, props);
    }
}