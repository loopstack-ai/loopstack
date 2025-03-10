import { Injectable } from '@nestjs/common';
import { ContextInterface } from '../interfaces/context.interface';
import { StateMachineConfigService } from './state-machine-config.service';
import { WorkflowService } from '../../persistence/services/workflow.service';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { TransitionPayloadInterface } from '@loopstack/shared';
import _ from 'lodash';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { HistoryTransition } from '../../persistence/interfaces';
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { StateMachineActionService } from './state-machine-action.service';
import { WorkflowEntity } from '../../persistence/entities';
import { WorkflowStatePlaceInfoDto } from '../../persistence/dtos';
import { WorkflowStateHistoryDto } from '../../persistence/dtos';
import { WorkflowStateMachineDefaultType } from '../../configuration/schemas/workflow.schema';
import { WorkflowTransitionType } from '../../configuration/schemas/workflow-transition.schema';
import { WorkflowObserverType } from '../../configuration/schemas/workflow-observer.schema';

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
    stateMachineConfig: WorkflowStateMachineDefaultType,
  ): Promise<WorkflowEntity> {
    console.log('starting with', workflow?.place);

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
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionType[],
    historyItem: HistoryTransition,
  ): void {
    workflow.place = historyItem.to;
    workflow.history = new WorkflowStateHistoryDto([
      ...(workflow.history?.history ?? []),
      historyItem,
    ]);

    workflow.placeInfo = new WorkflowStatePlaceInfoDto(
      transitions.filter(
        (item) =>
          // (
          item.from.includes('*') ||
          (workflow.place && item.from.includes(workflow.place)),
        // ) && (!item.condition || item.condition?.(workflowState)),
      ),
    );
  }

  async initStateMachine(
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionType[],
    invalidationReasons: string[],
  ): Promise<WorkflowEntity> {
    workflow.isWorking = true;

    // reset workflow to initial if there are invalidation reasons
    if (workflow.place === 'initial' || invalidationReasons.length) {
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'initial',
      };

      this.updateWorkflowState(workflow, transitions, initialTransition);
    }

    await this.workflowService.save(workflow);
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
    let nextTransition = workflow.placeInfo?.availableTransitions.find(
      (item) => item.trigger === 'auto',
    );

    if (!nextTransition && userTransitions.length) {
      const nextPending = userTransitions.shift()!;
      nextTransition = workflow.placeInfo?.availableTransitions.find(
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
      from: workflow.place,
      to: nextTransition.to,
      payload: transitionPayload,
      meta: transitionMeta,
    };
  }

  async loopStateMachine(
    context: ContextInterface,
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionType[],
    observers: WorkflowObserverType[],
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

        console.log(transitionContext)

        if (null === transitionContext) {
          break;
        }

        try {
          const matchedObservers = observers.filter(
            (item) => item.transition === transitionContext!.transition,
          );

          let nextPlace: string | null = null;
          for (const observer of matchedObservers) {
            console.log(
              `calling observer ${observer.action} on transition ${observer.transition}`,
            );

            const actionResult =
              await this.stateMachineActionService.executeAction(
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

          this.updateWorkflowState(workflow, transitions, historyItem);

          await this.workflowService.save(workflow);
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
    await this.workflowService.save(workflow);

    return workflow;
  }
}
