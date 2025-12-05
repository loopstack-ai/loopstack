import { Injectable, Logger } from '@nestjs/common';
import {
  ToolSideEffects,
  TransitionResultLookup,
  WorkflowEntity,
} from '@loopstack/common';
import {
  HistoryTransition,
  TransitionInfoInterface,
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  WorkflowTransitionType,
  WorkflowType,
} from '@loopstack/contracts/types';
import { WorkflowState } from '@loopstack/contracts/enums';

import { BlockHelperService } from './block-helper.service';
import { omit } from 'lodash';
import { z } from 'zod';
import { Workflow } from '../abstract';
import { ProcessorFactory } from './processor.factory';
import { StateMachineToolCallProcessorService } from './state-machine-tool-call-processor.service';
import {
  ConfigTraceError,
  TemplateExpressionEvaluatorService,
  WorkflowTransitionDto,
} from '../../common';
import { WorkflowStateService } from './workflow-state.service';

const TransitionValidationsSchema = z.array(
  z
    .object({
      id: z.string(),
      from: z.union([z.string(), z.array(z.string())]).optional(),
      to: z.union([z.string(), z.array(z.string())]).optional(),
      when: z.enum(['manual', 'onEntry']).optional(),
      onError: z.string().optional(),
    })
    .strict(),
);

@Injectable()
export class StateMachineProcessorService {
  private readonly logger = new Logger(StateMachineProcessorService.name);

  constructor(
    private readonly blockHelperService: BlockHelperService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly workflowStateService: WorkflowStateService,
    private readonly stateMachineToolCallProcessorService: StateMachineToolCallProcessorService,
  ) {}

  updateAvailableTransitions(block: Workflow): void {
    this.logger.debug(
      `Updating Available Transitions for Place "${block.state.place}"`,
    );

    const config = block.config as WorkflowType;

    // exclude call property from transitions eval because this should be only
    // evaluated when called, so it received actual arguments
    const transitionsWithoutCallProperty = config.transitions!.map(
      (transition) => omit(transition, ['call']),
    );

    // make (latest) context available within service class
    const evaluatedTransitions =
      this.templateExpressionEvaluatorService.evaluateTemplate<
        WorkflowTransitionType[]
      >(
        transitionsWithoutCallProperty,
        block,
        ['workflow'],
        TransitionValidationsSchema,
      );

    block.state.availableTransitions = evaluatedTransitions.filter(
      (item) =>
        item.from?.includes('*') ||
        (typeof item.from === 'string' && item.from === block.state.place) ||
        (Array.isArray(item.from) && item.from.includes(block.state.place)),
    );
  }

  validateTransition(
    nextTransition: TransitionInfoInterface,
    historyItem: HistoryTransition,
  ) {
    const to = Array.isArray(nextTransition.to)
      ? nextTransition.to
      : [nextTransition.to];

    if (
      !historyItem.to ||
      ![...to, nextTransition.from].includes(historyItem.to)
    ) {
      throw new Error(
        `target place "${historyItem.to}" not available in transition`,
      );
    }
  }

  getNextTransition(
    block: Workflow,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): WorkflowTransitionDto | undefined {
    if (!block.state.availableTransitions?.length) {
      this.logger.debug(`No transitions available.`);
      return undefined;
    }

    let nextTransition: WorkflowTransitionType | undefined;

    this.logger.debug(
      `Available Transitions: ${block.state.availableTransitions.map((t) => t.id).join(', ')}`,
    );

    if (pendingTransition) {
      nextTransition = block.state.availableTransitions.find(
        (item) => item.id === pendingTransition.id,
      );
    }

    if (!nextTransition) {
      nextTransition = block.state.availableTransitions.find(
        (item) => undefined === item.when || item.when === 'onEntry',
      );
    }

    if (!nextTransition || !nextTransition.to) {
      return undefined;
    }

    return new WorkflowTransitionDto({
      id: nextTransition.id,
      from: block.state.place,
      to: nextTransition.to,
      onError: nextTransition.onError,
      payload:
        nextTransition.id === pendingTransition?.id
          ? pendingTransition?.payload
          : null,
    });
  }

  commitWorkflowTransition(
    block: Workflow,
    effects: ToolSideEffects,
    nextTransition: TransitionMetadataInterface,
  ) {
    const place =
      effects.setTransitionPlace ??
      (Array.isArray(nextTransition.to)
        ? nextTransition.to[0]
        : nextTransition.to);

    const historyItem: HistoryTransition = {
      transition: nextTransition.id,
      from: nextTransition.from,
      to: place,
    };

    this.validateTransition(nextTransition, historyItem);

    block.state.place = historyItem.to;
    block.state.history.push(historyItem);
  }

  async processStateMachine(
    workflowEntity: WorkflowEntity,
    block: Workflow,
    pendingTransitions: TransitionPayloadInterface[],
    factory: ProcessorFactory,
  ): Promise<Workflow> {
    const config = block.config as WorkflowType;
    if (!config.transitions) {
      throw new Error(`Workflow ${block.name} does not have any transitions.`);
    }

    let transitionResults: TransitionResultLookup = {};
    try {
      while (true) {
        this.logger.debug('------------ NEXT TRANSITION');

        const nextPendingTransition = pendingTransitions.shift();

        this.logger.debug(
          `next pending transition: ${nextPendingTransition?.id ?? 'none'}`,
        );

        this.updateAvailableTransitions(block);

        block.state.transition = this.getNextTransition(
          block,
          nextPendingTransition,
        );

        // persist workflow for state and added documents of previous loop iteration
        await this.blockHelperService.persistBlockState(workflowEntity, block);

        const currentTransition = block.state.transition;

        // no more transitions?
        if (!currentTransition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(`Applying next transition: ${currentTransition.id}`);

        // get tool calls for transition
        const toolCalls = config.transitions!.find(
          (transition) => transition.id === currentTransition.id,
        )?.call;

        const { effects, toolResults } =
          await this.stateMachineToolCallProcessorService.processToolCalls(
            block,
            toolCalls,
            factory,
          );

        transitionResults[currentTransition.id] = {
          toolResults,
        };

        // update the transition result object
        block.state.transitionResults = transitionResults;

        // apply the transition to next place
        this.commitWorkflowTransition(block, effects, currentTransition);
      }
    } catch (e) {
      this.logger.error(new ConfigTraceError(e, block));
      workflowEntity.errorMessage = e.message;
      workflowEntity.hasError = true;
    }

    if (workflowEntity.hasError) {
      workflowEntity.status = WorkflowState.Failed;
      block.state.error = true;
      block.state.stop = true;
    } else if (block.state.place === 'end') {
      workflowEntity.status = WorkflowState.Completed;
    } else {
      workflowEntity.status = WorkflowState.Waiting;
      block.state.stop = true;
    }

    await this.blockHelperService.persistBlockState(workflowEntity, block);
    return block;
  }
}
