import { Injectable, Logger } from '@nestjs/common';
import { StateMachineConfigService } from './state-machine-config.service';
import {
  ContextInterface,
  HistoryTransition,
  EvalContextInfo,
  TransitionInfoInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowObserverType,
  WorkflowStateHistoryDto,
  WorkflowStateMachineType,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { ConfigValueParserService } from '../../common';
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
    private readonly configValueParserService: ConfigValueParserService,
  ) {}

  canSkipRun(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): StateMachineValidatorResultInterface {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) =>
        validator.validate(pendingTransition, workflow, options),
      );

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

    const pendingTransition =
      context.transition?.workflowId === workflow.id
        ? context.transition
        : undefined;

    const validatorResult = this.canSkipRun(
      pendingTransition,
      workflow,
      options,
    );

    const stateMachineInfo = new StateMachineInfoDto(
      options,
      pendingTransition,
      validatorResult,
    );

    if (stateMachineInfo.isStateValid && !pendingTransition) {
      return workflow!;
    }

    this.logger.debug(`Process state machine for workflow ${workflow!.name}`);

    return this.loopStateMachine(context, workflow, config, stateMachineInfo);
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
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    workflow.isWorking = true;

    // reset workflow to initial if there are invalidation reasons
    if (!stateMachineInfo.isStateValid) {
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'initial',
      };

      workflow.prevData = workflow.currData;
      workflow.currData = null;
      workflow.hashRecord = {
        ...(workflow?.hashRecord ?? {}),
        ...stateMachineInfo.hashRecordUpdates,
      };

      this.updateWorkflowState(workflow, transitions, initialTransition);
    }

    await this.workflowService.save(workflow);
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
    let transitionPayload = {};
    let transitionMeta = {};
    let nextTransition = workflow.placeInfo?.availableTransitions.find(
      (item) => item.trigger === 'auto',
    );

    if (!nextTransition && pendingTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => item.name === pendingTransition.name,
      );

      if (nextTransition) {
        transitionPayload = pendingTransition.payload;
        transitionMeta = pendingTransition.meta;
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
    config: WorkflowStateMachineType,
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    const flatConfig =
      this.workflowConfigService.getStateMachineFlatConfig(config);

    const info = {
      options: stateMachineInfo.options,
    } as EvalContextInfo;

    const { transitions, observers } =
      this.configValueParserService.evalWithContextAndInfo<{
        transitions: WorkflowTransitionType[];
        observers: WorkflowObserverType[];
      }>(flatConfig, { context, info });

    workflow = await this.initStateMachine(
      workflow,
      transitions,
      stateMachineInfo,
    );

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
      info.transition = nextTransition.transition;
      info.payload = nextTransition.payload;

      try {
        const matchedObservers = observers.filter(
          (item) => item.transition === nextTransition.transition,
        );

        let observerIndex = 0;
        let nextPlace: string | undefined = undefined;
        for (const observer of matchedObservers) {
          observerIndex++;

          this.logger.debug(
            `Call observer ${observerIndex} (${observer.tool}) on transition ${observer.transition}`,
          );

          const result = await this.toolExecutionService.applyTool(
            observer,
            workflow,
            context,
            info,
          );

          if (result.workflow || result.data) {
            if (result.workflow) {
              workflow = result.workflow;
            }

            if (result.data) {
              if (!workflow.currData) {
                workflow.currData = {};
              }

              const transitionName = nextTransition.transition;
              if (!workflow.currData[transitionName]) {
                workflow.currData[transitionName] = {};
              }

              const toolName = observer.alias ?? observer.tool;
              workflow.currData[transitionName][toolName] = result.data;
            }

            await this.workflowService.save(workflow);
          }

          if (result.data?.nextPlace) {
            nextPlace = result.data.nextPlace;
          }
        }

        nextPlace =
          nextPlace ??
          (Array.isArray(nextTransition.to)
            ? nextTransition.to[0]
            : nextTransition.to);

        const historyItem: HistoryTransition = {
          transition: nextTransition.transition,
          from: nextTransition.from,
          to: nextPlace,
        };

        this.validateTransition(nextTransition, historyItem);
        this.updateWorkflowState(workflow, transitions, historyItem);
        await this.workflowService.save(workflow);
      } catch (e) {
        this.logger.error(e);
        workflow.error = e.message;
        break;
      }
    }

    workflow.isWorking = false;
    await this.workflowService.save(workflow);

    return workflow;
  }
}
