import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Pipeline, Tool, Workflow } from '../../abstract';
import {
  AssignmentConfigType, HandlerCallResult,
  HistoryTransition,
  StateMachineInfoDto, ToolSideEffects,
  TransitionInfoInterface,
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowState,
  WorkflowStateHistoryDto,
  WorkflowStatePlaceInfoDto,
  WorkflowTransitionType, WorkflowType,
} from '@loopstack/shared';
import { BlockHelperService } from '../block-helper.service';
import { TemplateExpressionEvaluatorService } from '../template-expression-evaluator.service';
import { WorkflowStateService } from '../workflow-state.service';
import {
  StateMachineValidatorResultInterface
} from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { omit } from 'lodash';
import { ConfigTraceError } from '../../../configuration';
import { WorkflowService } from '../../../persistence';
import { StateMachineValidatorRegistry } from '../state-machine-validator.registry';
import { z } from 'zod';
import { CapabilityBuilder } from '../capability-builder.service';
import { BlockProcessor } from '../block-processor.service';
import { BlockRegistryService } from '../block-registry.service';
import { BlockFactory } from '../block.factory';
import { ToolExecutionContextDto } from '../../dtos/block-execution-context.dto';
import { BlockStateDto } from '../../dtos/workflow-state.dto';

export type StepResultLookup = Record<string, Pipeline | Workflow>;

export type ToolResultLookup = Record<string, HandlerCallResult>;

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
export class WorkflowProcessorService implements Processor {
  private readonly logger = new Logger(WorkflowProcessorService.name);

  constructor(
    private readonly blockHelperService: BlockHelperService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly workflowStateService: WorkflowStateService,
    private readonly workflowService: WorkflowService,
    private readonly stateMachineValidatorRegistry: StateMachineValidatorRegistry,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly capabilityBuilder: CapabilityBuilder,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
  ) {}

  async process(block: Workflow, factory: ProcessorFactory): Promise<Workflow> {
    // create or load state if needed
    const currentWorkflow = await this.workflowStateService.getWorkflowState(block);

    block.state.id = currentWorkflow.id;
    block.state.documentIds = currentWorkflow.documents.map((doc) => doc.id);

    // block.ctx.workflow = new WorkflowMetadataDto(currentWorkflow);

    // // todo: populate instance properties instead?
    // block.setData(currentWorkflow.data);

    // make the context available within service class
    // block.updateCtx();

    const result =
      await this.processStateMachine(
        currentWorkflow,
        block,
        factory
      );

    if (false === result) {
      return block;
    }

    return result;
  }

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
    factory: ProcessorFactory,
  ): Promise<Workflow | false> {
    if (!workflow) {
      throw new Error(`No workflow entry.`);
    }
    const validatorResult = this.canSkipRun(workflow, block.args);

    const pendingTransition =
      validatorResult.valid && block.ctx.payload?.transition?.workflowId === workflow.id
        ? block.ctx.payload?.transition
        : undefined;

    const stateMachineInfo = new StateMachineInfoDto(
      pendingTransition,
      validatorResult,
    );

    if (stateMachineInfo.isStateValid && !pendingTransition) {
      console.log('Skipping processing since state is processed still valid.')
      return false;
    }

    this.logger.debug(`Process state machine for workflow ${workflow!.configKey}`);

    const { workflow: updatedWorkflow, block: updatedBlockInstance } = await this.loopStateMachine(
      workflow,
      block,
      stateMachineInfo,
      factory
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
  ): TransitionMetadataInterface | undefined {
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
      return undefined;
    }

    return {
      id: nextTransition.id,
      from: workflow.place,
      to: nextTransition.to,
      onError: nextTransition.onError,
      payload: nextTransition.id === pendingTransition?.id ? pendingTransition?.payload : null,
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

  parseToolArguments(block: Workflow, tool: string, argsInput: any) {
    const blockRegistryItem = this.blockRegistryService.getBlock(tool);
    if (!blockRegistryItem) {
      throw new Error(`Config for tool ${tool} not found.`)
    }

    return this.templateExpressionEvaluatorService.evaluateTemplate<any>(
      argsInput,
      block,
      ['tool'],
      blockRegistryItem.metadata.properties,
    );
  }

  async loopStateMachine(
    workflow: WorkflowEntity,
    block: Workflow,
    stateMachineInfo: StateMachineInfoDto,
    factory: ProcessorFactory,
  ): Promise<{ workflow: WorkflowEntity, block: Workflow }> {
    this.initStateMachine(workflow, stateMachineInfo);

    const config = block.config as WorkflowType
    if (!config.transitions) {
      throw new Error(
        `Workflow ${block.name} does not have any transitions.`,
      );
    }

    let transitionResults: TransitionResultLookup = {};
    try {
      const pendingTransition = [stateMachineInfo.pendingTransition];
      while (true) {

        this.logger.debug('------------ NEXT TRANSITION')

        const nextPending = pendingTransition.shift();

        this.logger.debug(`next pending transition: ${nextPending?.id ?? 'none'}`);

        const config = block.config as WorkflowType;

        // exclude call property from transitions eval because this should be only
        // evaluated when called, so it received actual arguments
        const transitionsWithoutCallProperty =
          config.transitions!.map((transition) =>
            omit(transition, ['call']),
          );

        // make (latest) context available within service class
        const evaluatedTransitions = this.templateExpressionEvaluatorService.evaluateTemplate<
          WorkflowTransitionType[]
        >(
          transitionsWithoutCallProperty,
          block,
          ['workflow'],
          TransitionValidationsSchema,
        );

        this.updateWorkflowAvailableTransitions(workflow, evaluatedTransitions);
        await this.workflowService.save(workflow);

        block.state.history = workflow.history?.history.map((item) => item.transition) ?? [];
        block.state.transition = this.getNextTransition(workflow, nextPending);
        if (!block.state.transition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(
          `Applying next transition: ${block.state.transition!.id}`,
        );

        // get tool calls for transition
        const toolCalls = config.transitions!.find(
          (transition) => transition.id === block.state.transition!.id,
        )?.call;

        const effects: ToolSideEffects = {}
        let toolResults: Record<string, any> = {};

        try {
          if (toolCalls) {
            let i = 0;

            for (const toolCall of toolCalls) {
              this.logger.debug(
                `Call tool ${i} (${toolCall.tool}) on transition ${block.state.transition!.id}`,
              );

              const args = this.parseToolArguments(block, toolCall.tool, toolCall.args);

              const toolBlock = await this.blockFactory.createBlock<Tool, ToolExecutionContextDto, BlockStateDto>(
                toolCall.tool,
                args,
                new ToolExecutionContextDto({
                  ...block.ctx,
                  workflow: block.state,
                }),
              );

              const resultDto = await this.blockProcessor.processBlock<Tool>(toolBlock, factory);
              const toolCallResult: HandlerCallResult = resultDto.result;

              this.blockHelperService.assignToTargetBlock(toolCall.assign as AssignmentConfigType, block, resultDto);

              if (toolCall.id) {
                toolResults[toolCall.id] = toolCallResult;
              }
              toolResults[i.toString()] = toolCallResult;

              block.state.toolResults = toolResults;

              if (toolCallResult.effects) {
                Object.assign(effects, toolCallResult.effects);

                if (toolCallResult.effects.addWorkflowDocuments?.length) {
                  this.workflowService.addDocuments(workflow, toolCallResult.effects.addWorkflowDocuments);
                  block.state.setDocumentIds(workflow.documents);
                }
              }

              i++;
            }
          }
        } catch (e) {
          // re-throw error if errors are not handled gracefully
          if (!block.state.transition!.onError) {
            throw e;
          }

          // roll back to original workflow so no changes are committed
          workflow = await this.workflowService.reload(workflow.id);

          Object.assign(effects, {
            setTransitionPlace: block.state.transition!.onError,
          } satisfies ToolSideEffects);

          this.addWorkflowTransitionData(
            workflow,
            block.state.transition!.id!,
            'error',
            e.message,
          );
        }

        if (block.state.transition?.id) {
          transitionResults[block.state.transition?.id] = {
            toolResults
          }
        }

        // update the transition result object
        block.state.transitionResults = transitionResults;

        // apply the transition to next place
        this.commitWorkflowTransition(workflow, effects, block.state.transition!);
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