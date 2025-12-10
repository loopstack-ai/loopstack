import { Injectable, Logger } from '@nestjs/common';
import {
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

import { omit } from 'lodash';
import { z } from 'zod';
import { WorkflowBase } from '../abstract';
import { StateMachineToolCallProcessorService } from './state-machine-tool-call-processor.service';
import {
  ConfigTraceError,
  TemplateExpressionEvaluatorService,
  WorkflowTransitionDto,
} from '../../common';
import { WorkflowExecution } from '../interfaces/workflow-execution.interface';
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
    private readonly workflowStateService: WorkflowStateService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly stateMachineToolCallProcessorService: StateMachineToolCallProcessorService,
  ) {}

  getAvailableTransitions(block: WorkflowBase, ctx: WorkflowExecution): WorkflowTransitionType[] {
    this.logger.debug(
      `Updating Available Transitions for Place "${ctx.state.getMetadata('place')}"`,
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
        { schema: TransitionValidationsSchema },
      );

    return evaluatedTransitions.filter(
      (item) =>
        item.from?.includes('*') ||
        (typeof item.from === 'string' && item.from === ctx.state.getMetadata('place')) ||
        (Array.isArray(item.from) && item.from.includes(ctx.state.getMetadata('place'))),
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
    ctx: WorkflowExecution,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): WorkflowTransitionDto | undefined {
    if (!ctx.runtime.availableTransitions.length) {
      this.logger.debug(`No transitions available.`);
      return undefined;
    }

    let nextTransition: WorkflowTransitionType | undefined;

    this.logger.debug(
      `Available Transitions: ${ctx.runtime.availableTransitions.map((t) => t.id).join(', ')}`,
    );

    if (pendingTransition) {
      nextTransition = ctx.runtime.availableTransitions.find(
        (item) => item.id === pendingTransition.id,
      );
    }

    if (!nextTransition) {
      nextTransition = ctx.runtime.availableTransitions.find(
        (item) => undefined === item.when || item.when === 'onEntry',
      );
    }

    if (!nextTransition || !nextTransition.to) {
      return undefined;
    }

    return new WorkflowTransitionDto({
      id: nextTransition.id,
      from: ctx.state.getMetadata('place'),
      to: nextTransition.to,
      onError: nextTransition.onError,
      payload:
        nextTransition.id === pendingTransition?.id
          ? pendingTransition?.payload
          : null,
    });
  }

  commitWorkflowTransition(
    ctx: WorkflowExecution,
    nextTransition: TransitionMetadataInterface,
  ) {
    const place =
      ctx.runtime.nextPlace ??
      (Array.isArray(nextTransition.to)
        ? nextTransition.to[0]
        : nextTransition.to);

    const historyItem: HistoryTransition = {
      transition: nextTransition.id,
      from: nextTransition.from,
      to: place,
    };

    this.validateTransition(nextTransition, historyItem);

    ctx.state.setMetadata('place', historyItem.to);
    ctx.state.setMetadata('transition', historyItem);

    ctx.state.checkpoint(historyItem.transition);
  }

  async processStateMachine(
    block: WorkflowBase,
    args: any,
    ctx: WorkflowExecution,
    pendingTransitions: TransitionPayloadInterface[],
  ): Promise<WorkflowExecution> {
    const config = block.config as WorkflowType;
    if (!config.transitions) {
      throw new Error(`Workflow ${block.name} does not have any transitions.`);
    }

    try {
      while (true) {
        this.logger.debug('------------ NEXT TRANSITION');

        const nextPendingTransition = pendingTransitions.shift();

        this.logger.debug(
          `next pending transition: ${nextPendingTransition?.id ?? 'none'}`,
        );

        ctx.runtime.nextPlace = undefined;
        ctx.runtime.availableTransitions = this.getAvailableTransitions(block, ctx);
        ctx.runtime.transition = this.getNextTransition(
          ctx,
          nextPendingTransition,
        );

        // persist workflow for state and added documents of previous loop iteration
        await this.workflowStateService.saveExecutionState(ctx);

        // no more transitions?
        if (!ctx.runtime.transition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(`Applying next transition: ${ctx.runtime.transition.id}`);

        // get tool calls for transition
        const toolCalls = config.transitions!.find(
          (transition) => transition.id === ctx.runtime.transition!.id,
        )?.call;

        ctx =
          await this.stateMachineToolCallProcessorService.processToolCalls(
            block,
            toolCalls,
            args,
            ctx,
          );

        this.commitWorkflowTransition(ctx, ctx.runtime.transition!);
      }
    } catch (e) {
      this.logger.error(new ConfigTraceError(e, block));
      ctx.entity.errorMessage = e.message;
      ctx.entity.hasError = true;
    }

    if (ctx.entity.hasError) {
      ctx.entity.status = WorkflowState.Failed;
      ctx.runtime.error = true;
      ctx.runtime.stop = true;
    } else if (ctx.state.getMetadata('place') === 'end') {
      ctx.entity.status = WorkflowState.Completed;
    } else {
      ctx.entity.status = WorkflowState.Waiting;
      ctx.runtime.stop = true;
    }

    await this.workflowStateService.saveExecutionState(ctx);
    return ctx;
  }


}
