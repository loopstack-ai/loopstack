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
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { StateMachineActionService } from './state-machine-action.service';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';
import {ProcessStateInterface} from "../../processor/interfaces/process-state.interface";
import {WorkflowStatePlaceInfoDto} from "../../persistence/dtos/workflow-state-place-info.dto";
import {WorkflowStateEntity} from "../../persistence/entities";
import {WorkflowStateHistoryDto} from "../../persistence/dtos";

@Injectable()
export class StateMachineProcessorService {
  constructor(
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowService: WorkflowService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly stateMachineActionService: StateMachineActionService,
  ) {}

  canSkipRun(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): { valid: boolean; reasons: string[] } {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) =>
        validator.validate(pendingTransition, workflow, options),
      );
    return {
      valid: validationResults.every((item) => item.valid),
      reasons: _.map(validationResults, 'reason').filter(
        (item) => null !== item,
      ),
    };
  }

  async processStateMachine(
    context: ContextInterface,
    workflow: WorkflowEntity,
    stateMachineConfig: WorkflowStateMachineConfigInterface,
  ): Promise<WorkflowEntity> {
    console.log('starting with', workflow?.state.place);

    const pendingTransition =
      context.transition?.workflowId === workflow.id
        ? context.transition
        : undefined;

    const { valid, reasons: invalidationReasons } = this.canSkipRun(
      pendingTransition,
      workflow,
      context.customOptions,
    );

    const workflowStateContext: WorkflowStateContextInterface = {
      pendingTransition,
      isStateValid: valid,
      invalidationReasons,
    };

    if (workflowStateContext.isStateValid) {
      return workflow;
    }

    console.log(`Processing State Machine for workflow ${workflow.name}`);

    const { transitions, observers } =
      this.workflowConfigService.getStateMachineFlatConfig(stateMachineConfig);

    return this.loopStateMachine(
      context,
      workflow,
      transitions,
      observers,
      workflowStateContext,
    );
  }

  updateWorkflowState(
    workflowState: WorkflowStateEntity,
    transitions: WorkflowTransitionConfigInterface[],
    historyItem: HistoryTransition,
  ): void {
    workflowState.place = historyItem.to;
    workflowState.history = new WorkflowStateHistoryDto([
        ...(workflowState.history?.history ?? []),
        historyItem,
    ]);

    workflowState.placeInfo = new WorkflowStatePlaceInfoDto(transitions.filter(
      (item) =>
        // (
        item.from.includes('*') || (workflowState.place && item.from.includes(workflowState.place)),
      // ) && (!item.condition || item.condition?.(workflowState)),
    ));
  }

  async initStateMachine(
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionConfigInterface[],
    invalidationReasons: string[],
  ): Promise<WorkflowEntity> {
    workflow.isWorking = true;

    // reset workflow to initial if there are invalidation reasons
    if (invalidationReasons.length) {
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.state.place,
        to: 'initial'
      }

      this.updateWorkflowState(
          workflow.state,
          transitions,
          initialTransition
      );
    }

    await this.workflowService.saveWorkflow(workflow);
    return workflow;
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
    let nextTransition = workflow.state.placeInfo?.availableTransitions.find(
      (item) => item.trigger === 'auto',
    );

    if (!nextTransition && userTransitions.length) {
      const nextPending = userTransitions.shift()!;
      nextTransition = workflow.state.placeInfo?.availableTransitions.find(
        (item) => item.name === nextPending.name,
      );

      if (nextTransition) {
        transitionPayload = nextPending.payload;
        transitionMeta = nextPending.meta;
      }
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
    context: ContextInterface,
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionConfigInterface[],
    observers: WorkflowObserverConfigInterface[],
    workflowStateContext: WorkflowStateContextInterface,
  ): Promise<WorkflowEntity> {
    workflow = await this.initStateMachine(
      workflow,
      transitions,
      workflowStateContext.invalidationReasons,
    );

    const userTransitions = workflowStateContext.pendingTransition
      ? [workflowStateContext.pendingTransition]
      : [];

    outerLoop: while (true) {
      while (true) {
        const transitionContext = this.getTransitionContext(
          workflow,
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
            console.log(`calling observer ${observer.action} on transition ${observer.transition}`);

            const actionResult = await this.stateMachineActionService.executeAction(
              observer,
              context,
              workflowStateContext,
              transitionContext,
              workflow,
            );

            if (actionResult.nextPlace) {
              nextPlace = actionResult.nextPlace;
            }

            if (actionResult.workflow) {
              workflow = actionResult.workflow;
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

          this.updateWorkflowState(
            workflow.state,
            transitions,
            historyItem,
          );

          await this.workflowService.saveWorkflow(workflow);
        } catch (e) {
          console.log(e);
          workflow.error = e.message;
          break outerLoop;
        }
      }

      if (!userTransitions.length) {
        break;
      }
    }

    workflow.isWorking = false;
    await this.workflowService.saveWorkflow(workflow);

    return workflow;
  }
}
