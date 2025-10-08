import { Injectable, Logger } from '@nestjs/common';
import {
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
  WorkflowTransitionType, AssignmentConfigType, ToolSideEffects,
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
import { ConfigTraceError } from '../../configuration';
import { Pipeline, Workflow, Tool } from '../abstract';
import { BlockHelperService } from './block-helper.service';

export type StepResultLookup = Record<string, Pipeline | Workflow>;

export type ToolResultLookup = Record<string, Tool>;

export type TransitionResultLookup = Record<string, {
  toolResults: ToolResultLookup
}>;

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
    private readonly workflowService: WorkflowService,
    private readonly toolExecutionService: ToolExecutionService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly workflowContextService: WorkflowContextService,
    private readonly blockHelperService: BlockHelperService,
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
    workflow: WorkflowEntity,
    block: Workflow,
  ): Promise<Workflow | false> {
    if (!workflow) {
      throw new Error(`No workflow entry.`);
    }
    const validatorResult = this.canSkipRun(workflow, block.args);

    const pendingTransition =
      validatorResult.valid && block.context.payload?.transition?.workflowId === workflow.id
        ? block.context.payload?.transition
        : undefined;

    const stateMachineInfo = new StateMachineInfoDto(
      pendingTransition,
      validatorResult,
    );

    if (stateMachineInfo.isStateValid && !pendingTransition) {
      return false;
    }

    this.logger.debug(`Process state machine for workflow ${workflow!.configKey}`);

    const { workflow: updatedWorkflow, block: updatedBlockInstance } = await this.loopStateMachine(
      workflow,
      block,
      stateMachineInfo,
    );

    if (updatedWorkflow.status === WorkflowState.Failed) {
      updatedBlockInstance.state.error = true;
    }

    if (updatedBlockInstance.state.error || updatedWorkflow.place !== 'end') {
      updatedBlockInstance.state.stop = true;
    }

    return updatedBlockInstance;
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

    this.logger.debug(`Updating Available Transitions for Place "${workflow.place}"`);

    workflow.placeInfo = new WorkflowStatePlaceInfoDto(
      transitions.filter(
        (item) =>
          item.from?.includes('*') ||
          (typeof item.from === 'string' && item.from === workflow.place) ||
          (Array.isArray(item.from) && item.from.includes(workflow.place)),
      ),
    );
  }

  initStateMachine(
    workflow: WorkflowEntity,
    stateMachineInfo: StateMachineInfoDto,
  ): void {
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

    this.logger.debug(`Available Transitions: ${workflow.placeInfo?.availableTransitions.map((t) => t.id).join(', ')}`)

    if (pendingTransition) {
      nextTransition = workflow.placeInfo?.availableTransitions.find(
        (item) => item.id === pendingTransition.id,
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
      id: nextTransition.id,
      from: workflow.place,
      to: nextTransition.to,
      onError: nextTransition.onError,
    };
  }

  commitWorkflowTransition(
    workflow: WorkflowEntity,
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
    workflow: WorkflowEntity,
    block: Workflow,
    stateMachineInfo: StateMachineInfoDto,
  ): Promise<{ workflow: WorkflowEntity, block: Workflow }> {
    this.initStateMachine(workflow, stateMachineInfo);

    if (!block.config.transitions) {
      throw new Error(
        `Workflow ${workflow.configKey} does not have any transitions.`,
      );
    }

    let transitionResults: TransitionResultLookup = {};
    try {
      const pendingTransition = [stateMachineInfo.pendingTransition];
      while (true) {

        this.logger.debug('------------ NEXT TRANSITION')

        const nextPending = pendingTransition.shift();

        this.logger.debug(`next pending transition: ${nextPending?.id ?? 'none'}`);

        const stateMachineContext = {
          history:
            workflow.history?.history.map((item) => item.transition) ?? [],
          payload: nextPending?.payload ?? null,
        };

        // exclude call property from transitions eval because this should be only
        // evaluated when called, so it received actual arguments
        const transitionsWithoutCallProperty =
          block.config.transitions!.map((transition) =>
            omit(transition, ['call']),
          );
        const evaluatedTransitions =
          this.templateExpressionEvaluatorService.parse<
            WorkflowTransitionType[]
          >(
            transitionsWithoutCallProperty,
            {
              this: block.toOutputObject()
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

        // update the metadata object with actual transition
        block.setTransition({
          ...stateMachineContext,
          ...nextTransition,
        });

        this.logger.debug(
          `Applying next transition: ${block.currentTransition!.id}`,
        );

        // get tool calls for transition
        const toolCalls = block.config.transitions!.find(
          (transition) => transition.id === block.currentTransition!.id,
        )?.call;

        const effects: ToolSideEffects = {}
        let nextPlace: string | undefined = undefined;
        let toolResults: Record<string, any> = {};

        try {
          if (toolCalls) {
            let i = 0;

            for (const toolCall of toolCalls) {
              this.logger.debug(
                `Call tool ${i} (${toolCall.tool}) on transition ${block.currentTransition!.id}`,
              );

              if (!block.metadata.imports.includes(toolCall.tool)) {
                throw new Error(`Tool with name ${toolCall.tool} not found in scope of ${block.name}`);
              }

              // apply the tool and reassign the block instance
              const tool = await this.toolExecutionService.applyTool(
                toolCall,
                block,
                workflow,
                toolResults,
                transitionResults,
              );

              this.blockHelperService.assignToTargetBlock(toolCall.assign as AssignmentConfigType, {
                this: tool,
                workflow: block,
              });

              const output = tool.toOutputObject()
              if (toolCall.id) {
                toolResults[toolCall.id] = output;
              }
              toolResults[i.toString()] = output;

              if (tool.result.effects) {
                Object.assign(effects, tool.result.effects);
              }

              // todo: currently we cannot change the workflow entity in a tool call since the result of it is discarded:
              // add the response data to workflow
              // workflow = this.commitToolCallResult(
              //   workflow,
              //   block.currentTransition!.transition!,
              //   `call-${index}`,
              //   toolCall,
              //   result,
              // );

              // todo: also context updates should be reworked
              // // update the context for subsequent tool calls
              // if (workflow.contextVariables) {
              //   context.variables = {
              //     ...context.variables,
              //     ...workflow.contextVariables,
              //   };
              // }

              // todo: also place updates should be reworked
              // // set the next place, if specified
              // if (result?.place) {
              //   nextPlace = result?.place;
              // }

              i++;
            }
          }
        } catch (e) {
          // re-throw error if errors are not handled gracefully
          if (!block.currentTransition!.onError) {
            throw e;
          }

          // roll back to original workflow so no changes are committed
          workflow = await this.workflowService.reload(workflow.id);

          Object.assign(effects, {
            setTransitionPlace: block.currentTransition!.onError,
          } satisfies ToolSideEffects);

          this.addWorkflowTransitionData(
            workflow,
            block.currentTransition!.id!,
            'error',
            e.message,
          );
        }

        if (block.currentTransition?.id) {
          transitionResults[block.currentTransition?.id] = {
            toolResults
          }
        }

        // update the transition result object
        block.transitionResults = transitionResults;

        // apply the transition to next place
        this.commitWorkflowTransition(workflow, effects, block.currentTransition!);
      }
    } catch (e) {
      this.logger.error(new ConfigTraceError(e, block));

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

    return { workflow, block };
  }
}
