import {Injectable} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowObserverConfigInterface,
  WorkflowStateMachineConfigInterface,
  WorkflowTransitionConfigInterface
} from '@loopstack/shared';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { StateMachineConfigService } from './state-machine-config.service';
import { WorkflowStateService } from '../../persistence/services/workflow-state.service';
import { WorkflowState } from '../../persistence/entities/workflow-state.entity';
import {StateMachineValidatorRegistry} from "../registry/state-machine-validator.registry";
import {TransitionPayloadInterface} from "../interfaces/transition-payload.interface";
import _ from 'lodash';
import {LoopEvent} from "../../event/enums/event.enum";
import {TransitionContextInterface} from "../interfaces/transition-context.interface";
import {HistoryTransition} from "../../persistence/interfaces/history-transition.interface";
import {StateMachineContextInterface} from "../interfaces/state-machine-context.interface";
import {StateMachineActionService} from "./state-machine-action.service";

@Injectable()
export class StateMachineProcessorService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly stateMachineActionService: StateMachineActionService,
  ) {}

  async getWorkflowState(
    workflowName: string,
    context: ContextInterface,
  ): Promise<WorkflowState> {
    let workflowState = await this.workflowStateService.loadByIdentity(
      context.projectId,
      workflowName,
      context.namespaces,
    );

    if (workflowState) {
      return workflowState;
    }

    return this.workflowStateService.createState({
      projectId: context.projectId,
      userId: context.userId,
      namespaces: context.namespaces,
      name: workflowName,
    });
  }

  canSkipRun(pendingWorkflowTransitions: any[], workflowState: any): { valid: boolean; reasons: string[]; } {
    const validationResults = this.stateMachineValidatorRegistry.getValidators().map(validator => validator.validate(pendingWorkflowTransitions, workflowState));
    return {
      valid: validationResults.every((item) => item.valid),
      reasons: _.map(validationResults, 'reason').filter((item) => null !== item),
    }
  }

  async processStateMachine(
    workflowName: string,
    stateMachineConfig: WorkflowStateMachineConfigInterface,
    context: ContextInterface,
  ): Promise<WorkflowState> {
    const workflowState = await this.getWorkflowState(workflowName, context);

    const pendingWorkflowTransitions = context.transitions.filter(
        (t) => t.workflowStateId === workflowState.id,
    );

    const { valid, reasons: invalidationReasons } = this.canSkipRun(pendingWorkflowTransitions, workflowState);

    const workflowContext: StateMachineContextInterface = {
      pendingTransitions: pendingWorkflowTransitions,
      isStateValid: valid,
      invalidationReasons,
    }

    if (workflowContext.isStateValid) {
      return workflowState;
    }

    console.log(`Processing State Machine for workflow ${workflowName}`);

    const { transitions, observers } =
        this.workflowConfigService.getStateMachineFlatConfig(stateMachineConfig);

    return this.loopStateMachine(
        workflowState,
        context,
        transitions,
        observers,
        workflowContext,
    );
  }

  getAvailableTransitions(
      place: string,
      transitions: WorkflowTransitionConfigInterface[],
      ): WorkflowTransitionConfigInterface[] {
    return transitions.filter((item) =>
      // (
      item.from.includes('*') ||
      (place && item.from.includes(place))
      // ) && (!item.condition || item.condition?.(workflowState)),
    );
  }

  async initStateMachine(
      workflowState: WorkflowState,
      transitions: WorkflowTransitionConfigInterface[],
      invalidationReasons: string[],
  ) {

    // reset workflow to initial if there are invalidation reasons
    if (invalidationReasons.length) {
      workflowState.stateMachine.place = 'initial';
    }

    workflowState.isWorking = true;

    workflowState.stateMachine.availableTransitions = this.getAvailableTransitions(workflowState.stateMachine.place, transitions);

    await this.workflowStateService.saveWorkflowState(workflowState);
    return workflowState;
  }

  markPendingTransitionProcessed(transition: TransitionPayloadInterface) {
    this.eventEmitter.emit(
        LoopEvent.userInputProcessed,
        transition.id,
    );
  }

  validateTransition(transition: TransitionContextInterface, nextPlace: string) {
    const to = Array.isArray(transition.to)
        ? transition.to
        : [transition.to];

    if (!nextPlace || ![...to, transition.from].includes(nextPlace)) {
      throw new Error(
          `target place "${nextPlace}" not available in transition`,
      );
    }
  }

  getTransitionContext(state: WorkflowState, userTransitions: TransitionPayloadInterface[]): TransitionContextInterface | null {
    let transitionPayload = {};
    let transitionMeta = {};
    let nextTransition = state.stateMachine.availableTransitions.find((item) => item.trigger === 'auto');

    if (!nextTransition && userTransitions.length) {
      const nextPending = userTransitions.shift()!;
      nextTransition = state.stateMachine.availableTransitions.find((item) => item.name === nextPending.transition);

      if (nextTransition) {
        transitionPayload = nextPending.payload;
        transitionMeta = nextPending.meta;
      }

      // confirm even if transition could not be applied, so it does not block
      this.markPendingTransitionProcessed(nextPending);
    }

    if (!nextTransition) {
      return null;
    }

    return {
      transition: nextTransition.name,
      from: state.stateMachine.place,
      to: nextTransition.to,
      payload: transitionPayload,
      meta: transitionMeta,
    }
  }

  async loopStateMachine(
      workflowState: WorkflowState,
      context: ContextInterface,
      transitions: WorkflowTransitionConfigInterface[],
      observers: WorkflowObserverConfigInterface[],
      workflowContext: StateMachineContextInterface,
  ): Promise<WorkflowState> {
    let state = await this.initStateMachine(workflowState, transitions, workflowContext.invalidationReasons);

    const userTransitions = [...workflowContext.pendingTransitions];

    outerLoop: while (true) {
      while (true) {

        const transitionContext = this.getTransitionContext(state, userTransitions);

        if (null === transitionContext) {
          break;
        }

        try {
          const matchedObservers = observers.filter((item) => item.transition === transitionContext!.transition);

          let nextPlace: string | null = null;
          for (const observer of matchedObservers) {

            const result = await this.stateMachineActionService.executeAction(
                observer,
                context,
                workflowContext,
                transitionContext,
                state,
            );

            if (result.nextPlace) {
              nextPlace = result.nextPlace;
            }

            if (result.state) {
              state =  result.state;
            }
          }

          nextPlace = nextPlace ?? Array.isArray(transitionContext.to)
              ? transitionContext.to[0]
              : transitionContext.to;

          this.validateTransition(transitionContext, nextPlace);

          const historyItem: HistoryTransition = {
            transition: transitionContext.transition,
            from: transitionContext.from,
            to: nextPlace,
          };

          state.stateMachine.place = historyItem.to;
          state.stateMachine.transitionHistory.push(historyItem);
          state.stateMachine.availableTransitions = this.getAvailableTransitions(state.stateMachine.place, transitions);

          await this.workflowStateService.saveWorkflowState(state);

        } catch (e) {
          console.log(e);
          state.error = e.message;
          break outerLoop;
        }
      }

      if(!userTransitions.length) {
        break;
      }
    }

    state.isWorking = false;
    await this.workflowStateService.saveWorkflowState(state);

    return state;
  }
}
