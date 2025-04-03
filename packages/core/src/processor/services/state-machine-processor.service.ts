import { Injectable } from '@nestjs/common';
import { StateMachineConfigService } from './state-machine-config.service';
import {
  HistoryTransition,
  ProcessStateInterface, TransitionContextInterface,
  TransitionPayloadInterface, WorkflowEntity,
  WorkflowStateContextInterface,
  WorkflowStateHistoryDto,
  WorkflowStateMachineType,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType,
} from '@loopstack/shared';
import _ from 'lodash';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';

@Injectable()
export class StateMachineProcessorService {
  constructor(
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowService: WorkflowService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
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
    processState: ProcessStateInterface,
    stateMachineConfig: WorkflowStateMachineType,
  ): Promise<WorkflowEntity> {
    const { context, workflow, data } = processState;
    console.log('starting with', workflow!.place);

    const pendingTransition =
      context.transition?.workflowId === workflow!.id
        ? processState.context.transition
        : undefined;

    const { valid, reasons: invalidationReasons } = this.canSkipRun(
      pendingTransition,
      workflow!,
      data?.options,
    );

    const workflowStateContext: WorkflowStateContextInterface = {
      pendingTransition,
      isStateValid: valid,
      invalidationReasons,
    };

    if (workflowStateContext.isStateValid) {
      return workflow!;
    }

    console.log(`Processing State Machine for workflow ${workflow!.name}`);

    return this.loopStateMachine(
      processState,
      stateMachineConfig,
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
    processState: ProcessStateInterface,
    stateMachineConfig: WorkflowStateMachineType,
    workflowStateContext: WorkflowStateContextInterface,
  ): Promise<WorkflowEntity> {
    const { transitions, observers } =
      this.workflowConfigService.getStateMachineFlatConfig(stateMachineConfig);

    let workflow = await this.initStateMachine(
      processState.workflow!,
      transitions,
      workflowStateContext.invalidationReasons,
    );

    const context = processState.context;
    const data = processState.data;

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
          let observerIndex = 0;
          for (const observer of matchedObservers) {
            observerIndex++;

            console.log(
              `calling observer ${observer.tool} on transition ${observer.transition}`,
            );

            const result = await this.toolExecutionService.applyTool(
              observer,
              workflow,
              context,
              data,
              {
                transition: transitionContext.transition,
                payload: transitionContext.payload,
              },
            );

            if (result.data?.data?.nextPlace) {
              nextPlace = result.data?.data?.nextPlace;
            }

            if (result.workflow) {
              workflow = result.workflow;
            }

            // save immediately for multiple observers
            // skip saving the last one here
            if (observerIndex <= matchedObservers.length) {
              await this.workflowService.save(workflow);
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
