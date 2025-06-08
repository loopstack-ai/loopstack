import { Injectable, Logger } from '@nestjs/common';
import { StateMachineConfigService } from './state-machine-config.service';
import {
  ContextInterface,
  HistoryTransition,
  TransitionInfoInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowStateHistoryDto,
  WorkflowStateMachineType,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType, TransitionMetadataInterface, ToolCallType,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { ValueParserService } from '../../common';
import { StateMachineValidatorResultInterface } from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { omit } from 'lodash';

@Injectable()
export class StateMachineProcessorService {
  private readonly logger = new Logger(StateMachineProcessorService.name);

  constructor(
    private readonly workflowConfigService: StateMachineConfigService,
    private readonly workflowService: WorkflowService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly configValueParserService: ValueParserService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
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
          item.from?.includes('*') ||
          (workflow.place && item.from?.includes(workflow.place)),
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
    let nextTransition: WorkflowTransitionType | undefined;

    if (pendingTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => item.name === pendingTransition.name,
      );
    }

    if (!nextTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => undefined === item.when || item.when === 'onEntry',
      );
    }

    if (!nextTransition || !nextTransition.to) {
      return null;
    }

    return {
      transition: nextTransition.name,
      from: workflow.place,
      to: nextTransition.to,
    };
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
    // await this.workflowService.save(workflow); // todo: check. probably do not need to save here

    const workflowConfig = this.workflowConfigService.getConfig(config);
    if (!workflowConfig.transitions) {
      throw new Error(`Workflow ${workflow.name} does not have any transitions.`);
    }

    // const workflowContext = {
    //   options: stateMachineInfo.options,
    // } as WorkflowRunContext;

    try {
      const pendingTransition = [stateMachineInfo.pendingTransition];
      while (true) {

        const meta: TransitionMetadataInterface = {
          history: workflow.history?.history.map((item) => item.transition) ?? [],

          // add the pending transition in the first iteration only
          payload: pendingTransition.shift()?.payload ?? null,
        }

        // exclude call property from transitions eval because this should be only evaluated when called for correct arguments
        const transitionsWithoutCallProperty = workflowConfig.transitions.map((transition) => omit(transition, ['call']));
        const evaluatedTransitions = this.templateExpressionEvaluatorService.evaluate<WorkflowTransitionType[]>(
          transitionsWithoutCallProperty,
          stateMachineInfo.options,
          context,
          workflow,
          meta,
        )

        this.updateWorkflowAvailableTransitions(workflow, evaluatedTransitions);
        await this.workflowService.save(workflow);

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

        // update the metadata object with actual transition
        meta.transition = nextTransition.transition;
        meta.from = nextTransition.from;
        meta.to = nextTransition.to;

        // get tool calls for transition
        const toolCalls = workflowConfig.transitions
          .find((transition) => transition.name === meta.transition)?.call;

        let nextPlace: string | undefined = undefined;
        if (toolCalls) {
          let index = 0;

          for (const toolCall of toolCalls) {
            index++;

            this.logger.debug(
              `Call tool ${index} (${toolCall.tool}) on transition ${meta.transition}`,
            );

            // evaluate tool call config late in the execution for up-to-date arguments
            const evaluatedToolCall = this.templateExpressionEvaluatorService.evaluate<ToolCallType>(
              toolCall,
              stateMachineInfo.options,
              context,
              workflow,
              meta,
            )

            // apply the tool
            const result = await this.toolExecutionService.applyTool(
              evaluatedToolCall,
              workflow,
              context,
              meta,
            );

            // add the response data to workflow
            workflow = this.toolExecutionService.commitServiceCallResult(
              workflow,
              meta.transition,
              toolCall.tool,
              toolCall.exportAs,
              result,
            );

            // save workflow directly for immediate ui updates
            if (result?.persist) {
              await this.workflowService.save(workflow);
            }

            // set the next place, if specified
            if (result?.place) {
              nextPlace = result?.place;
            }
          }
        }

        this.commitWorkflowTransition(workflow, nextPlace, nextTransition);
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
