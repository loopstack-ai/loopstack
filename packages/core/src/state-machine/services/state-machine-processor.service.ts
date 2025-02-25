import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkflowObserverConfigInterface,
  WorkflowStateMachineConfigInterface,
  WorkflowTransitionConfigInterface,
} from '@loopstack/shared';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { StateMachineConfigService } from './state-machine-config.service';
import { WorkflowService } from '../../persistence/services/workflow.service';
import { StateMachineValidatorRegistry } from '../registry/state-machine-validator.registry';
import { TransitionPayloadInterface } from '../interfaces/transition-payload.interface';
import _ from 'lodash';
import { LoopEvent } from '../../event/enums/event.enum';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { HistoryTransition } from '../../persistence/interfaces/history-transition.interface';
import { StateMachineContextInterface } from '../interfaces/state-machine-context.interface';
import { StateMachineActionService } from './state-machine-action.service';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
export class StateMachineProcessorService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowStateService: WorkflowService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly stateMachineActionService: StateMachineActionService,
  ) {}

  async getWorkflow(
    workflowName: string,
    context: ContextInterface,
  ): Promise<WorkflowEntity> {
    let workflow = await this.workflowStateService.loadByIdentity(
      context.projectId,
      workflowName,
      context.namespaces,
    );

    if (workflow) {
      return workflow;
    }

    return this.workflowStateService.createState({
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      createdBy: context.userId,
      namespaces: context.namespaces,
      name: workflowName,
    });
  }

  canSkipRun(
    pendingWorkflowTransitions: TransitionPayloadInterface[],
    workflow: WorkflowEntity,
    options: Record<string, any>,
  ): { valid: boolean; reasons: string[] } {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) =>
        validator.validate(pendingWorkflowTransitions, workflow, options),
      );
    return {
      valid: validationResults.every((item) => item.valid),
      reasons: _.map(validationResults, 'reason').filter(
        (item) => null !== item,
      ),
    };
  }

  async processStateMachine(
    workflowName: string,
    stateMachineConfig: WorkflowStateMachineConfigInterface,
    context: ContextInterface,
    options: Record<string, any>,
  ): Promise<WorkflowEntity> {
    const workflow = await this.getWorkflow(workflowName, context);

    const pendingWorkflowTransitions = context.transitions.filter(
      (t) => t.workflowStateId === workflow.id,
    );

    const { valid, reasons: invalidationReasons } = this.canSkipRun(
      pendingWorkflowTransitions,
      workflow,
      options,
    );

    const workflowContext: StateMachineContextInterface = {
      pendingTransitions: pendingWorkflowTransitions,
      isStateValid: valid,
      invalidationReasons,
    };

    if (workflowContext.isStateValid) {
      return workflow;
    }

    console.log(`Processing State Machine for workflow ${workflowName}`);

    const { transitions, observers } =
      this.workflowConfigService.getStateMachineFlatConfig(stateMachineConfig);

    return this.loopStateMachine(
      workflow,
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
    return transitions.filter(
      (item) =>
        // (
        item.from.includes('*') || (place && item.from.includes(place)),
      // ) && (!item.condition || item.condition?.(workflowState)),
    );
  }

  async initStateMachine(
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionConfigInterface[],
    invalidationReasons: string[],
  ) {
    // reset workflow to initial if there are invalidation reasons
    if (invalidationReasons.length) {
      workflow.state.place = 'initial';
    }

    workflow.isWorking = true;

    workflow.state.availableTransitions = this.getAvailableTransitions(
      workflow.state.place,
      transitions,
    );

    await this.workflowStateService.saveWorkflowState(workflow);
    return workflow;
  }

  markPendingTransitionProcessed(transition: TransitionPayloadInterface) {
    this.eventEmitter.emit(LoopEvent.userInputProcessed, transition.id);
  }

  validateTransition(
    transition: TransitionContextInterface,
    nextPlace: string,
  ) {
    const to = Array.isArray(transition.to) ? transition.to : [transition.to];

    if (!nextPlace || ![...to, transition.from].includes(nextPlace)) {
      throw new Error(
        `target place "${nextPlace}" not available in transition`,
      );
    }
  }

  getTransitionContext(
    workflow: WorkflowEntity,
    userTransitions: TransitionPayloadInterface[],
  ): TransitionContextInterface | null {
    let transitionPayload = {};
    let transitionMeta = {};
    let nextTransition = workflow.state.availableTransitions.find(
      (item) => item.trigger === 'auto',
    );

    if (!nextTransition && userTransitions.length) {
      const nextPending = userTransitions.shift()!;
      nextTransition = workflow.state.availableTransitions.find(
        (item) => item.name === nextPending.transition,
      );

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
      from: workflow.state.place,
      to: nextTransition.to,
      payload: transitionPayload,
      meta: transitionMeta,
    };
  }

  async loopStateMachine(
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitions: WorkflowTransitionConfigInterface[],
    observers: WorkflowObserverConfigInterface[],
    workflowContext: StateMachineContextInterface,
  ): Promise<WorkflowEntity> {
    let state = await this.initStateMachine(
      workflow,
      transitions,
      workflowContext.invalidationReasons,
    );

    const userTransitions = [...workflowContext.pendingTransitions];

    outerLoop: while (true) {
      while (true) {
        const transitionContext = this.getTransitionContext(
          state,
          userTransitions,
        );

        if (null === transitionContext) {
          break;
        }

        try {
          const matchedObservers = observers.filter(
            (item) => item.transition === transitionContext!.transition,
          );

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

            if (result.workflow) {
              state = result.workflow;
            }
          }

          nextPlace =
            (nextPlace ?? Array.isArray(transitionContext.to))
              ? transitionContext.to[0]
              : transitionContext.to;

          this.validateTransition(transitionContext, nextPlace);

          const historyItem: HistoryTransition = {
            transition: transitionContext.transition,
            from: transitionContext.from,
            to: nextPlace,
          };

          state.state.place = historyItem.to;
          state.state.transitionHistory.push(historyItem);
          state.state.availableTransitions = this.getAvailableTransitions(
            state.state.place,
            transitions,
          );

          await this.workflowStateService.saveWorkflowState(state);
        } catch (e) {
          console.log(e);
          state.error = e.message;
          break outerLoop;
        }
      }

      if (!userTransitions.length) {
        break;
      }
    }

    state.isWorking = false;
    await this.workflowStateService.saveWorkflowState(state);

    return state;
  }
}
