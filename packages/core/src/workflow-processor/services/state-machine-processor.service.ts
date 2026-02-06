import { Injectable, Logger } from '@nestjs/common';
import { omit, uniq } from 'lodash';
import { z } from 'zod';
import {
  WorkflowExecution,
  WorkflowInterface,
  WorkflowTransitionDto,
  getBlockConfig,
  getBlockResultSchema,
  getBlockTemplateHelpers,
} from '@loopstack/common';
import { WorkflowState } from '@loopstack/contracts/enums';
import { WorkflowTransitionSchema } from '@loopstack/contracts/schemas';
import type {
  HistoryTransition,
  TransitionInfoInterface,
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  WorkflowTransitionType,
  WorkflowType,
} from '@loopstack/contracts/types';
import { ConfigTraceError, TemplateExpressionEvaluatorService } from '../../common';
import { getTemplateVars } from '../utils/template-helper';
import { StateMachineToolCallProcessorService } from './state-machine-tool-call-processor.service';
import { WorkflowStateService } from './workflow-state.service';

@Injectable()
export class StateMachineProcessorService {
  private readonly logger = new Logger(StateMachineProcessorService.name);

  constructor(
    private readonly workflowStateService: WorkflowStateService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly stateMachineToolCallProcessorService: StateMachineToolCallProcessorService,
  ) {}

  getAvailableTransitions(block: WorkflowInterface, args: any, ctx: WorkflowExecution): WorkflowTransitionType[] {
    this.logger.debug(`Updating Available Transitions for Place "${ctx.state.getMetadata('place')}"`);

    const config = getBlockConfig<WorkflowType>(block) as WorkflowType;
    if (!config) {
      throw new Error(`Block ${block.constructor.name} is missing @BlockConfig decorator`);
    }

    // exclude call property from transitions eval because this should be only
    // evaluated when called, so it received actual arguments
    const transitionsWithoutCallProperty = config.transitions!.map((transition) => omit(transition, ['call']));

    // make (latest) context available within service class
    const evaluatedTransitions = this.templateExpressionEvaluatorService.evaluateTemplate<WorkflowTransitionType[]>(
      transitionsWithoutCallProperty,
      getTemplateVars(args, ctx),
      {
        cacheKey: block.constructor.name,
        helpers: getBlockTemplateHelpers(block),
        schema: z.array(WorkflowTransitionSchema),
      },
    );

    const validPlaces = uniq(['start', 'end', ...(config.transitions?.map((t) => t.from).flat() ?? [])]);

    const isValidFromPlace = (from: string | string[]) =>
      (typeof from === 'string' && (from === '*' || from === ctx.state.getMetadata('place'))) ||
      (Array.isArray(from) && (from.includes('*') || from.includes(ctx.state.getMetadata('place'))));

    const isValidToPlace = (to: string) => validPlaces.includes(to);

    const isEnabledPlace = (value: string | number | boolean | undefined) => value === undefined || !!value;

    return evaluatedTransitions.filter(
      (item) => isValidFromPlace(item.from) && isValidToPlace(item.to) && isEnabledPlace(item.if),
    );
  }

  validateTransition(nextTransition: TransitionInfoInterface, historyItem: HistoryTransition) {
    if (!historyItem.to || ![nextTransition.to, nextTransition.from].includes(historyItem.to)) {
      throw new Error(`target place "${historyItem.to}" not available in transition`);
    }
  }

  getNextTransition(
    ctx: WorkflowExecution<any>,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): WorkflowTransitionDto | undefined {
    if (!ctx.runtime.availableTransitions.length) {
      this.logger.debug(`No transitions available.`);
      return undefined;
    }

    let nextTransition: WorkflowTransitionType | undefined;

    this.logger.debug(`Available Transitions: ${ctx.runtime.availableTransitions.map((t) => t.id).join(', ')}`);

    if (pendingTransition) {
      nextTransition = ctx.runtime.availableTransitions.find((item) => item.id === pendingTransition.id);
    }

    if (!nextTransition) {
      nextTransition = ctx.runtime.availableTransitions.find(
        (item) =>
          (undefined === item.trigger || item.trigger === 'onEntry') && (undefined === item.if || item.if === 'true'),
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
      payload: nextTransition.id === pendingTransition?.id ? (pendingTransition?.payload as unknown) : null,
    });
  }

  commitWorkflowTransition(ctx: WorkflowExecution, nextTransition: TransitionMetadataInterface) {
    const place = ctx.runtime.nextPlace ?? nextTransition.to;

    const historyItem: HistoryTransition = {
      transition: nextTransition.id,
      from: nextTransition.from,
      to: place,
    };

    this.validateTransition(nextTransition, historyItem);

    ctx.state.setMetadata('place', historyItem.to);
    ctx.state.setMetadata('transition', historyItem);

    ctx.state.checkpoint();
  }

  async processStateMachine(
    block: WorkflowInterface,
    args: any,
    ctx: WorkflowExecution,
    pendingTransitions: TransitionPayloadInterface[],
  ): Promise<WorkflowExecution> {
    const config = getBlockConfig<WorkflowType>(block) as WorkflowType;
    if (!config) {
      throw new Error(`Block ${block.constructor.name} is missing @BlockConfig decorator`);
    }

    if (!config.transitions) {
      throw new Error(`Workflow ${block.constructor.name} does not have any transitions.`);
    }

    try {
      while (true) {
        this.logger.debug('------------ NEXT TRANSITION');

        const nextPendingTransition = pendingTransitions.shift();

        this.logger.debug(`next pending transition: ${nextPendingTransition?.id ?? 'none'}`);

        ctx.runtime.nextPlace = undefined;
        ctx.runtime.availableTransitions = this.getAvailableTransitions(block, args, ctx);
        ctx.runtime.transition = this.getNextTransition(ctx, nextPendingTransition);

        // persist workflow for state and added documents of previous loop iteration
        await this.workflowStateService.saveExecutionState(ctx);

        // no more transitions?
        if (!ctx.runtime.transition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(`Applying next transition: ${ctx.runtime.transition.id}`);

        // get tool calls for transition
        const toolCalls = config.transitions.find((transition) => transition.id === ctx.runtime.transition!.id)?.call;

        ctx = await this.stateMachineToolCallProcessorService.processToolCalls(block, toolCalls, args, ctx);

        this.commitWorkflowTransition(ctx, ctx.runtime.transition!);
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(new ConfigTraceError(error, block));
      ctx.entity.errorMessage = error.message;
      ctx.entity.hasError = true;
    }

    if (ctx.entity.hasError) {
      ctx.entity.status = WorkflowState.Failed;
      ctx.runtime.error = true;
      ctx.runtime.stop = true;
    } else if (ctx.state.getMetadata('place') === 'end') {
      ctx.entity.status = WorkflowState.Completed;
      const schema = getBlockResultSchema(block);
      if (schema && block.getResult) {
        const result = block.getResult(ctx, args) as unknown;
        ctx.entity.result = schema.parse(result) as Record<string, unknown>;
      }
    } else {
      ctx.entity.status = WorkflowState.Waiting;
      ctx.runtime.stop = true;
    }

    await this.workflowStateService.saveExecutionState(ctx);
    return ctx;
  }
}
