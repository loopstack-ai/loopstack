import { Injectable, Logger } from '@nestjs/common';
import { omit, uniq } from 'lodash';
import { z } from 'zod';
import { WorkflowEntity, getBlockConfig, getBlockTemplateHelpers } from '@loopstack/common';
import { WorkflowTransitionSchema } from '@loopstack/contracts/schemas';
import type {
  HistoryTransition,
  TransitionInfoInterface,
  TransitionPayloadInterface,
  WorkflowTransitionType,
  WorkflowType,
} from '@loopstack/contracts/types';
import { TemplateExpressionEvaluatorService } from '../../common';
import { WorkflowExecutionContextManager } from '../utils/execution-context-manager';
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

  getAvailableTransitions(ctx: WorkflowExecutionContextManager): WorkflowTransitionType[] {
    this.logger.debug(`Updating Available Transitions for Place "${ctx.getManager().getData('place')}"`);

    const config = getBlockConfig<WorkflowType>(ctx.getInstance()) as WorkflowType;
    if (!config) {
      throw new Error(`Block ${ctx.getInstance().constructor.name} is missing @Workflow decorator`);
    }

    // exclude call property from transitions eval because this should be only
    // evaluated when called, so it received actual arguments
    const transitionsWithoutCallProperty = config.transitions!.map((transition) => omit(transition, ['call']));

    // make (latest) context available within service class
    const evaluatedTransitions = this.templateExpressionEvaluatorService.evaluateTemplate<WorkflowTransitionType[]>(
      transitionsWithoutCallProperty,
      getTemplateVars(ctx),
      {
        cacheKey: ctx.getInstance().constructor.name,
        helpers: getBlockTemplateHelpers(ctx.getInstance()),
        schema: z.array(WorkflowTransitionSchema),
      },
    );

    const validPlaces = uniq(['start', 'end', ...(config.transitions?.map((t) => t.from).flat() ?? [])]);

    const isValidFromPlace = (from: string | string[]) =>
      (typeof from === 'string' && (from === '*' || from === ctx.getManager().getData('place'))) ||
      (Array.isArray(from) && (from.includes('*') || from.includes(ctx.getManager().getData('place'))));

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
    ctx: WorkflowExecutionContextManager,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): HistoryTransition | undefined {
    const availableTransitions: WorkflowTransitionType[] = ctx.getManager().getData('availableTransitions');

    if (!availableTransitions.length) {
      this.logger.debug(`No transitions available.`);
      return undefined;
    }

    let nextTransition: WorkflowTransitionType | undefined;

    this.logger.debug(`Available Transitions: ${availableTransitions.map((t) => t.id).join(', ')}`);

    if (pendingTransition) {
      nextTransition = availableTransitions.find((item) => item.id === pendingTransition.id);
    }

    if (!nextTransition) {
      nextTransition = availableTransitions.find(
        (item) =>
          (undefined === item.trigger || item.trigger === 'onEntry') && (undefined === item.if || item.if === 'true'),
      );
    }

    if (!nextTransition || !nextTransition.to) {
      return undefined;
    }

    return {
      id: nextTransition.id,
      from: ctx.getManager().getData('place'),
      to: nextTransition.to,
      onError: nextTransition.onError,
      payload: nextTransition.id === pendingTransition?.id ? (pendingTransition?.payload as unknown) : null,
    };
  }

  commitWorkflowTransition(ctx: WorkflowExecutionContextManager, nextPlace?: string) {
    const currentTransition = ctx.getManager().getData('transition')!;

    if (nextPlace) {
      if (nextPlace !== currentTransition.to && nextPlace !== currentTransition.onError) {
        throw new Error(`Transition to place ${nextPlace} not allowed.`);
      }

      currentTransition.to = nextPlace;
      ctx.getManager().setData('transition', currentTransition);
    }

    ctx.getManager().setData('place', currentTransition.to);
    ctx.getManager().checkpoint();
  }

  async processStateMachine(
    workflowEntity: WorkflowEntity,
    ctx: WorkflowExecutionContextManager,
    pendingTransitions: TransitionPayloadInterface[],
  ): Promise<WorkflowExecutionContextManager> {
    const config = getBlockConfig<WorkflowType>(ctx.getInstance()) as WorkflowType;
    if (!config) {
      throw new Error(`Block ${ctx.getInstance().constructor.name} is missing @BlockConfig decorator`);
    }

    if (!config.transitions) {
      throw new Error(`Workflow ${ctx.getInstance().constructor.name} does not have any transitions.`);
    }

    while (true) {
      this.logger.debug('------------ NEXT TRANSITION');

      const nextPendingTransition = pendingTransitions.shift();

      this.logger.debug(`next pending transition: ${nextPendingTransition?.id ?? 'none'}`);

      ctx.getManager().setData('nextPlace', undefined);
      ctx.getManager().setData('availableTransitions', this.getAvailableTransitions(ctx));
      ctx.getManager().setData('transition', this.getNextTransition(ctx, nextPendingTransition));

      // persist workflow for state and added documents of previous loop iteration
      await this.workflowStateService.saveExecutionState(workflowEntity, ctx);

      // no more transitions?
      const currentTransition = ctx.getManager().getData('transition');
      if (!currentTransition) {
        this.logger.debug('stop');
        break;
      }

      this.logger.debug(`Applying next transition: ${currentTransition.id}`);

      // get tool calls for transition
      const toolCalls = config.transitions.find((transition) => transition.id === currentTransition.id)?.call;

      try {
        ctx = await this.stateMachineToolCallProcessorService.processToolCalls(ctx, toolCalls);
        this.commitWorkflowTransition(ctx);
      } catch (e: unknown) {
        if (currentTransition.onError) {
          this.commitWorkflowTransition(ctx, currentTransition.onError);
        }

        throw e;
      }
    }
    return ctx;
  }
}
