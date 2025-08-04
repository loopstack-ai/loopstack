import { Injectable, Logger } from '@nestjs/common';
import {
  ConfigElement,
  ContextInterface,
  HistoryTransition,
  HandlerCallResult,
  ToolCallType,
  TransitionInfoInterface,
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowState,
  WorkflowStateHistoryDto,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType,
  WorkflowType,
} from '@loopstack/shared';
import { ToolExecutionService } from './tool-execution.service';
import { WorkflowService } from '../../persistence';
import { StateMachineValidatorRegistry } from './state-machine-validator.registry';
import { StateMachineValidatorResultInterface } from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { omit } from 'lodash';
import { WorkflowContextService } from './workflow-context.service';
import { z } from 'zod';

const TransitionValidationsSchema = z.array(
  z
    .object({
      name: z.string(),
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
    private readonly workflowService: WorkflowService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly workflowContextService: WorkflowContextService,
  ) {}

  canSkipRun(
    workflow: WorkflowEntity,
    args: Record<string, any> | undefined,
  ): StateMachineValidatorResultInterface {
    const validationResults = this.stateMachineValidatorRegistry
      .getValidators()
      .map((validator) => validator.validate(workflow, args));

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
    configElement: ConfigElement<WorkflowType>,
  ): Promise<WorkflowEntity> {
    const args = this.templateExpressionEvaluatorService.parse<
      Record<string, any>
    >(
      configElement.config.arguments,
      { context },
      {
        schema: undefined, // todo: define workflow parameters to validate/parse arguments
        omitAliasVariables: true,
        omitUseTemplates: true,
        omitWorkflowData: true,
      },
    );

    if (!workflow) {
      throw new Error(`No workflow entry.`);
    }
    const validatorResult = this.canSkipRun(workflow, args);

    const pendingTransition =
      validatorResult.valid && context.transition?.workflowId === workflow.id
        ? context.transition
        : undefined;

    const stateMachineInfo = new StateMachineInfoDto(
      args,
      pendingTransition,
      validatorResult,
    );

    if (stateMachineInfo.isStateValid && !pendingTransition) {
      return workflow;
    }

    this.logger.debug(`Process state machine for workflow ${workflow!.configKey}`);

    return this.loopStateMachine(
      context,
      workflow,
      configElement,
      stateMachineInfo,
    );
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
    workflow.status = WorkflowState.Running;

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
      onError: nextTransition.onError,
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

  addWorkflowTransitionData(
    workflow: WorkflowEntity,
    transition: string,
    index: string,
    data: any,
  ) {
    if (!workflow.currData) {
      workflow.currData = {};
    }

    if (!workflow.currData[transition]) {
      workflow.currData[transition] = {};
    }

    workflow.currData[transition][index] = data;
  }

  commitToolCallResult(
    workflow: WorkflowEntity,
    transition: string,
    index: string,
    toolCall: ToolCallType,
    result: HandlerCallResult | undefined,
  ) {
    if (result?.workflow) {
      workflow = result?.workflow;
    }

    this.addWorkflowTransitionData(workflow, transition, index, result?.data);

    if (toolCall.as) {
      const currAlias = workflow.aliasData ?? {};
      workflow.aliasData = {
        ...currAlias,
        [toolCall.as]: [transition, index],
      };
    }

    if (toolCall.exportContext) {
      workflow = this.workflowContextService.setWorkflowContextUpdate(
        workflow,
        toolCall.exportContext,
        result?.data,
      );
    }

    return workflow;
  }

  async loopStateMachine(
    beforeContext: ContextInterface,
    workflow: WorkflowEntity,
    configElement: ConfigElement<WorkflowType>,
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<WorkflowEntity> {
    let context = beforeContext;
    workflow = await this.initStateMachine(workflow, stateMachineInfo);

    if (!configElement.config.transitions) {
      throw new Error(
        `Workflow ${workflow.configKey} does not have any transitions.`,
      );
    }

    try {
      const pendingTransition = [stateMachineInfo.pendingTransition];
      while (true) {
        const nextPending = pendingTransition.shift();

        const transitionData: TransitionMetadataInterface = {
          history:
            workflow.history?.history.map((item) => item.transition) ?? [],

          // add the pending transition in the first iteration only
          payload: nextPending?.payload ?? null,
        };

        // exclude call property from transitions eval because this should be only
        // evaluated when called, so it received actual arguments
        const transitionsWithoutCallProperty =
          configElement.config.transitions.map((transition) =>
            omit(transition, ['call']),
          );
        const evaluatedTransitions =
          this.templateExpressionEvaluatorService.parse<
            WorkflowTransitionType[]
          >(
            transitionsWithoutCallProperty,
            {
              arguments: stateMachineInfo.options,
              context,
              workflow,
              transition: transitionData,
            },
            {
              schema: TransitionValidationsSchema,
            },
          );

        this.updateWorkflowAvailableTransitions(workflow, evaluatedTransitions);
        await this.workflowService.save(workflow);

        const nextTransition = this.getNextTransition(workflow, nextPending);
        if (!nextTransition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(
          `Applying next transition: ${nextTransition.transition}`,
        );

        // update the metadata object with actual transition
        transitionData.transition = nextTransition.transition;
        transitionData.from = nextTransition.from;
        transitionData.to = nextTransition.to;

        // get tool calls for transition
        const toolCalls = configElement.config.transitions.find(
          (transition) => transition.name === transitionData.transition,
        )?.call;

        let nextPlace: string | undefined = undefined;
        try {
          if (toolCalls) {
            let index = 0;

            for (const toolCall of toolCalls) {
              index++;

              this.logger.debug(
                `Call tool ${index} (${toolCall.tool}) on transition ${transitionData.transition}`,
              );

              // apply the tool
              const result = await this.toolExecutionService.applyTool(
                toolCall,
                stateMachineInfo.options,
                workflow,
                context,
                transitionData,
                {},
              );

              // add the response data to workflow
              workflow = this.commitToolCallResult(
                workflow,
                transitionData.transition,
                `call-${index}`,
                toolCall,
                result,
              );

              // update the context for subsequent tool calls
              if (workflow.contextVariables) {
                context.variables = {
                  ...context.variables,
                  ...workflow.contextVariables,
                };
              }

              // set the next place, if specified
              if (result?.place) {
                nextPlace = result?.place;
              }
            }
          }
        } catch (e) {
          // re-throw error if errors are not handled gracefully
          if (!nextTransition.onError) {
            throw e;
          }

          // roll back to original workflow so no changes are committed
          workflow = await this.workflowService.reload(workflow.id);

          // transition to error place
          nextPlace = nextTransition.onError;
          this.addWorkflowTransitionData(
            workflow,
            transitionData.transition,
            'error',
            e.message,
          );
        }

        // apply the transition to next place
        this.commitWorkflowTransition(workflow, nextPlace, nextTransition);
      }
    } catch (e) {
      this.logger.error(e);

      // roll back to original workflow so no changes are committed
      workflow = await this.workflowService.reload(workflow.id);
      workflow.error = e.message;
    }

    if (workflow.error) {
      workflow.status = WorkflowState.Failed;
    } else if (workflow.place === 'end') {
      workflow.status = WorkflowState.Completed;
    } else {
      workflow.status = WorkflowState.Waiting;
    }

    await this.workflowService.save(workflow);

    return workflow;
  }
}
