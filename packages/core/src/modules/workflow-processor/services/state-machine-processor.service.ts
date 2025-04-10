import { Injectable } from '@nestjs/common';
import { StateMachineConfigService } from './state-machine-config.service';
import {
  ContextInterface,
  HistoryTransition,
  TransitionInfoInterface,
  TransitionPayloadInterface,
  WorkflowEntity, WorkflowObserverType,
  WorkflowStateHistoryDto,
  WorkflowStateMachineType,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { ConfigValueParserService } from '../../common';
import {
  StateMachineValidatorResultInterface
} from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';

@Injectable()
export class StateMachineProcessorService {
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
          }
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

    const options = config.options ? this.configValueParserService.evalObjectLeafs<Record<string, any>>(config.options, { context }) : {};

    if (!workflow) {
      throw new Error(`No workflow entry.`)
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
    )

    if (stateMachineInfo.isStateValid) {
      return workflow!;
    }

    console.log(`Processing State Machine for workflow ${workflow!.name}`);

    return this.loopStateMachine(
      context,
      workflow,
      config,
      stateMachineInfo,
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
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    workflow.isWorking = true;

    // reset workflow to initial if there are invalidation reasons
    if (workflow.place === 'initial' || Object.keys(stateMachineInfo.hashRecordUpdates).length) {
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'initial',
      };

      workflow.prevData = workflow.currData;
      workflow.currData = null;
      workflow.hashRecord = {
        ...(workflow?.hashRecord ?? {}),
        ...stateMachineInfo.hashRecordUpdates
      }

      this.updateWorkflowState(workflow, transitions, initialTransition);
    }

    await this.workflowService.save(workflow);
    return workflow;
  }

  validateTransition(
    stateMachineInfo: StateMachineInfoDto,
    historyItem: HistoryTransition,
  ) {
    const to = Array.isArray(stateMachineInfo.transitionInfo!.to) ? stateMachineInfo.transitionInfo!.to : [stateMachineInfo.transitionInfo!.to];

    if (!historyItem.to || ![...to, stateMachineInfo.transitionInfo!.from].includes(historyItem.to)) {
      throw new Error(
        `target place "${historyItem.to}" not available in transition`,
      );
    }
  }

  getNextTransition(
    workflow: WorkflowEntity,
    stateMachineInfo: StateMachineInfoDto,
  ): TransitionInfoInterface | null {
    let transitionPayload = {};
    let transitionMeta = {};
    let nextTransition = workflow.placeInfo?.availableTransitions.find(
      (item) => item.trigger === 'auto',
    );

    if (!nextTransition && stateMachineInfo.pendingTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => item.name === stateMachineInfo.pendingTransition!.name,
      );

      if (nextTransition) {
        transitionPayload = stateMachineInfo.pendingTransition.payload;
        transitionMeta = stateMachineInfo.pendingTransition.meta;
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
    const flatConfig = this.workflowConfigService.getStateMachineFlatConfig(config);

    const { transitions, observers } = this.configValueParserService.evalObjectLeafs<{
      transitions: WorkflowTransitionType[],
      observers: WorkflowObserverType[],
    }>(flatConfig, {
      context,
      info: stateMachineInfo,
    })

    workflow = await this.initStateMachine(
      workflow,
      transitions,
      stateMachineInfo,
    );

    while (true) {
      stateMachineInfo.setTransitionInfo(
        this.getNextTransition(
          workflow,
          stateMachineInfo,
        )
      );

      if (null === stateMachineInfo.transitionInfo) {
        break;
      }

      try {
        const matchedObservers = observers.filter(
          (item) => item.transition === stateMachineInfo.transitionInfo!.transition,
        );

        let nextPlace: string | null = null;
        let observerIndex = 0;
        for (const observer of matchedObservers) {
          observerIndex++;

          console.log(
            `calling observer ${observerIndex} (${observer.tool}) on transition ${observer.transition}`,
          );

          const result = await this.toolExecutionService.applyTool(
            observer,
            workflow,
            context,
            stateMachineInfo,
          );

          if (result.workflow) {
            workflow = result.workflow;
          }

          if (result.data?.nextPlace) {
            nextPlace = result.data?.nextPlace;
          }

          if (result.data) {
            if (!workflow.currData) {
              workflow.currData = {};
            }

            const transitionName = stateMachineInfo.transitionInfo!.transition;
            if (!workflow.currData[transitionName]) {
              workflow.currData[transitionName] = {};
            }

            const toolName = observer.alias ?? observer.tool;
            workflow.currData[transitionName][toolName] = result.data;
          }

          // save immediately for multiple observers
          // skip saving the last one here
          if (observerIndex <= matchedObservers.length) {
            await this.workflowService.save(workflow);
          }
        }

        nextPlace =
          nextPlace ?? (Array.isArray(stateMachineInfo.transitionInfo!.to)
            ? stateMachineInfo.transitionInfo!.to[0]
            : stateMachineInfo.transitionInfo!.to);

        const historyItem: HistoryTransition = {
          transition: stateMachineInfo.transitionInfo!.transition,
          from: stateMachineInfo.transitionInfo!.from,
          to: nextPlace,
        };

        this.validateTransition(stateMachineInfo, historyItem);

        this.updateWorkflowState(workflow, transitions, historyItem);
        await this.workflowService.save(workflow);
      } catch (e) {
        console.log(e);
        workflow.error = e.message;
        break;
      }
    }

    workflow.isWorking = false;
    await this.workflowService.save(workflow);

    return workflow;
  }
}
