import { Injectable, Logger } from '@nestjs/common';
import { StateMachineConfigService } from './state-machine-config.service';
import {
  ContextInterface,
  HistoryTransition,
  WorkflowRunContext,
  TransitionInfoInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowStateHistoryDto,
  WorkflowStateMachineType,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType,
  ToolResult,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { ValueParserService } from '../../common';
import { StateMachineValidatorResultInterface } from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';

@Injectable()
export class StateMachineProcessorService {
  private readonly logger = new Logger(StateMachineProcessorService.name);

  constructor(
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowService: WorkflowService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly configValueParserService: ValueParserService,
  ) {}

  canSkipRun(
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): StateMachineValidatorResultInterface {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) => validator.validate(workflow, options));

    return {
      valid: validationResults.every((item) => item.valid),
      hashRecordUpdates: validationResults.reduce((prev, curr) => {
        if (curr.target && curr.hash) {
          return {
            ...prev,
            [curr.target as string]: curr.hash,
          };
        }

        return prev;
      }, {}),
    };
  }

  async processStateMachine(
    context: ContextInterface,
    workflow: WorkflowEntity,
    config: WorkflowStateMachineType,
  ): Promise<WorkflowEntity> {
    const options = this.configValueParserService.evalWithContext<
      Record<string, any>
    >(config.options, { context });

    if (!workflow) {
      throw new Error(`No workflow entry.`);
    }
    const validatorResult = this.canSkipRun(workflow, options);

    const pendingTransition =
      validatorResult.valid && context.transition?.workflowId === workflow.id
        ? context.transition
        : undefined;

    const stateMachineInfo = new StateMachineInfoDto(
      options,
      pendingTransition,
      validatorResult,
    );

    if (stateMachineInfo.isStateValid && !pendingTransition) {
      return workflow;
    }

    this.logger.debug(`Process state machine for workflow ${workflow!.name}`);

    return this.loopStateMachine(context, workflow, config, stateMachineInfo);
  }

  updateWorkflowState(
    workflow: WorkflowEntity,
    historyItem: HistoryTransition,
  ): void {
    workflow.place = historyItem.to;
    workflow.history = new WorkflowStateHistoryDto([
      ...(workflow.history?.history ?? []),
      historyItem,
    ]);
  }

  updateWorkflowAvailableTransitions(
    workflow: WorkflowEntity,
    transitions: WorkflowTransitionType[],
  ): void {
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
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    workflow.isWorking = true;

    // reset workflow to "start" if there are invalidation reasons
    if (!stateMachineInfo.isStateValid) {
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'start',
      };

      workflow.prevData = workflow.currData;
      workflow.currData = null;
      workflow.hashRecord = {
        ...(workflow?.hashRecord ?? {}),
        ...stateMachineInfo.hashRecordUpdates,
      };

      this.updateWorkflowState(workflow, initialTransition);
    }

    return workflow;
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
    workflow: WorkflowEntity,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): TransitionInfoInterface | null {
    let transitionPayload = null;
    let transitionMeta = {};
    let nextTransition: WorkflowTransitionType | undefined;

    if (pendingTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => item.name === pendingTransition.name,
      );

      if (nextTransition) {
        transitionPayload = pendingTransition.payload;
        transitionMeta = pendingTransition.meta;
      }
    }
    if (!nextTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => undefined === item.when || item.when === 'onEntry',
      );
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

  addTransitionData(
    workflow: WorkflowEntity,
    transition: string,
    tool: string,
    alias: string | undefined,
    result: ToolResult | undefined,
  ) {
    if (result?.workflow) {
      workflow = result?.workflow;
    }

    if (result?.data) {
      if (!workflow.currData) {
        workflow.currData = {};
      }

      if (!workflow.currData[transition]) {
        workflow.currData[transition] = {};
      }

      workflow.currData[transition][tool] = result.data;
    }

    if (alias) {
      const currAlias = workflow.aliasData ?? {};
      workflow.aliasData = {
        ...currAlias,
        [alias]: [transition, tool],
      };
    }

    return workflow;
  }

  commitWorkflowTransition(
    workflow: WorkflowEntity,
    nextPlace: string | undefined,
    nextTransition: TransitionInfoInterface,
  ) {
    const place =
      nextPlace ??
      (Array.isArray(nextTransition.to)
        ? nextTransition.to[0]
        : nextTransition.to);

    const historyItem: HistoryTransition = {
      transition: nextTransition.transition,
      from: nextTransition.from,
      to: place,
    };

    this.validateTransition(nextTransition, historyItem);
    this.updateWorkflowState(workflow, historyItem);
  }

  async loopStateMachine(
    beforeContext: ContextInterface,
    workflow: WorkflowEntity,
    config: WorkflowStateMachineType,
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    let context = beforeContext;
    workflow = await this.initStateMachine(workflow, stateMachineInfo);

    const flatConfig =
      this.workflowConfigService.getStateMachineFlatConfig(config);

    const workflowContext = {
      options: stateMachineInfo.options,
    } as WorkflowRunContext;

    workflowContext.history =
      workflow.history?.history.map((item) => item.transition) ?? [];
    const evaluatedTransitions =
      this.configValueParserService.evalWithContextAndInfo<
        WorkflowTransitionType[]
      >(flatConfig.transitions, { context, workflow: workflowContext });

    this.updateWorkflowAvailableTransitions(workflow, evaluatedTransitions);

    await this.workflowService.save(workflow);

    try {
      const pendingTransition = [stateMachineInfo.pendingTransition];
      while (true) {
        const nextTransition = this.getNextTransition(
          workflow,
          pendingTransition.shift(),
        );
        if (!nextTransition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(
          `Applying next transition: ${nextTransition.transition}`,
        );
        workflowContext.transition = nextTransition.transition;
        workflowContext.payload = nextTransition.payload;

        const handlers =
          flatConfig.handlers?.filter(
            (item) => item.onTransition === nextTransition.transition,
          ) ?? [];

        let observerIndex = 0;
        let nextPlace: string | undefined = undefined;
        for (const handler of handlers) {
          observerIndex++;

          this.logger.debug(
            `Call handler ${observerIndex} (${handler.call}) on transition ${handler.onTransition}`,
          );

          const result = await this.toolExecutionService.applyTool(
            handler,
            workflow,
            context,
            workflowContext,
          );

          // add the response data to workflow
          workflow = this.addTransitionData(
            workflow,
            handler.onTransition,
            handler.call,
            handler.provideAs,
            result,
          );

          // save workflow directly for immediate ui updates
          if (result?.commitDirect) {
            await this.workflowService.save(workflow);
          }

          // set the next place, if specified
          if (result?.place) {
            nextPlace = result?.place;
          }
        }

        this.commitWorkflowTransition(workflow, nextPlace, nextTransition);

        workflowContext.history =
          workflow.history?.history.map((item) => item.transition) ?? [];
        const evaluatedTransitions =
          this.configValueParserService.evalWithContextAndInfo<
            WorkflowTransitionType[]
          >(flatConfig.transitions, { context, workflow: workflowContext });

        this.updateWorkflowAvailableTransitions(workflow, evaluatedTransitions);

        await this.workflowService.save(workflow);
      }
    } catch (e) {
      this.logger.error(e);
      workflow.error = e.message;
    }

    workflow.isWorking = false;
    await this.workflowService.save(workflow);

    return workflow;
  }
}
