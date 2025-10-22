import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Tool, Workflow } from '../../abstract';
import {
  AssignmentConfigType,
  HandlerCallResult,
  HistoryTransition,
  ToolCallType,
  ToolSideEffects,
  TransitionInfoInterface,
  TransitionMetadataInterface,
  TransitionPayloadInterface,
  WorkflowEntity,
  WorkflowState,
  WorkflowTransitionType,
  WorkflowType,
} from '@loopstack/shared';
import { BlockHelperService } from '../block-helper.service';
import { TemplateExpressionEvaluatorService } from '../template-expression-evaluator.service';
import { WorkflowStateService } from '../workflow-state.service';
import { StateMachineValidatorResultInterface } from '@loopstack/shared/dist/interfaces/state-machine-validator-result.interface';
import { omit } from 'lodash';
import { StateMachineValidatorRegistry } from '../state-machine-validator.registry';
import { z } from 'zod';
import { BlockProcessor } from '../block-processor.service';
import { BlockRegistryService } from '../block-registry.service';
import { BlockFactory } from '../block.factory';
import { ToolExecutionContextDto } from '../../dtos';
import { TransitionResultLookup } from '@loopstack/shared/dist/interfaces/transition-results.types';
import { WorkflowTransitionDto } from '../../dtos';
import { WorkflowService } from '../../../persistence';
import { ConfigTraceError } from '../../errors';

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
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
  ) {}

  async process(block: Workflow, factory: ProcessorFactory): Promise<Workflow> {
    // create or load state if needed
    const workflowEntity =
      await this.workflowStateService.getWorkflowState(block);
    block.state = this.blockHelperService.initBlockState(workflowEntity);

    const validatorResult = this.canSkipRun(workflowEntity, block.args);

    const pendingTransition =
      validatorResult.valid &&
      block.ctx.payload?.transition?.workflowId === workflowEntity.id
        ? block.ctx.payload?.transition
        : undefined;

    if (validatorResult.valid && !pendingTransition) {
      this.logger.debug(
        'Skipping processing since state is processed still valid.',
      );
      return block;
    }

    this.logger.debug(
      `Process state machine for workflow ${workflowEntity!.configKey}`,
    );

    this.initStateMachine(block, workflowEntity, validatorResult);

    return this.processStateMachine(
      workflowEntity,
      block,
      pendingTransition ? [pendingTransition] : [],
      factory,
    );
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

  updateWorkflowState(block: Workflow, historyItem: HistoryTransition): void {
    block.state.place = historyItem.to;
    block.state.history.push(historyItem);
  }

  defineNextTransition(
    block: Workflow,
    pendingTransition: TransitionPayloadInterface | undefined,
  ) {
    block.state.transition = this.getNextTransition(block, pendingTransition);
  }

  updateAvailableTransitions(block: Workflow): void {
    this.logger.debug(
      `Updating Available Transitions for Place "${block.state.place}"`,
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
        ['workflow'],
        TransitionValidationsSchema,
      );

    block.state.availableTransitions = evaluatedTransitions.filter(
      (item) =>
        item.from?.includes('*') ||
        (typeof item.from === 'string' && item.from === block.state.place) ||
        (Array.isArray(item.from) && item.from.includes(block.state.place)),
    );
  }

  initStateMachine(
    block: Workflow,
    workflow: WorkflowEntity,
    validation: StateMachineValidatorResultInterface,
  ): void {
    workflow.status = WorkflowState.Running;

    if (!validation.valid) {
      workflow.hashRecord = {
        ...(workflow?.hashRecord ?? {}),
        ...validation.hashRecordUpdates,
      };

      // reset workflow to "start" if there are invalidation reasons
      const initialTransition: HistoryTransition = {
        transition: 'invalidation',
        from: workflow.place,
        to: 'start',
      };

      this.updateWorkflowState(block, initialTransition);
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
    block: Workflow,
    pendingTransition: TransitionPayloadInterface | undefined,
  ): WorkflowTransitionDto | undefined {
    if (!block.state.availableTransitions?.length) {
      this.logger.debug(`No transitions available.`);
      return undefined;
    }

    let nextTransition: WorkflowTransitionType | undefined;

    this.logger.debug(
      `Available Transitions: ${block.state.availableTransitions.map((t) => t.id).join(', ')}`,
    );

    if (pendingTransition) {
      nextTransition = block.state.availableTransitions.find(
        (item) => item.id === pendingTransition.id,
      );
    }

    if (!nextTransition) {
      nextTransition = block.state.availableTransitions.find(
        (item) => undefined === item.when || item.when === 'onEntry',
      );
    }

    if (!nextTransition || !nextTransition.to) {
      return undefined;
    }

    return new WorkflowTransitionDto({
      id: nextTransition.id,
      from: block.state.place,
      to: nextTransition.to,
      onError: nextTransition.onError,
      payload:
        nextTransition.id === pendingTransition?.id
          ? pendingTransition?.payload
          : null,
    });
  }

  commitWorkflowTransition(
    block: Workflow,
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
    this.updateWorkflowState(block, historyItem);
  }

  // addWorkflowTransitionData(
  //   workflow: WorkflowEntity,
  //   transition: string,
  //   index: string,
  //   data: any,
  // ) {
  //   if (!workflow.currData) {
  //     workflow.currData = {};
  //   }
  //
  //   if (!workflow.currData[transition]) {
  //     workflow.currData[transition] = {};
  //   }
  //
  //   workflow.currData[transition][index] = data;
  // }

  parseToolArguments(block: Workflow, tool: string, argsInput: any) {
    const blockRegistryItem = this.blockRegistryService.getBlock(tool);
    if (!blockRegistryItem) {
      throw new Error(`Config for tool ${tool} not found.`);
    }

    return this.templateExpressionEvaluatorService.evaluateTemplate<any>(
      argsInput,
      block,
      ['tool'],
      blockRegistryItem.metadata.properties,
    );
  }

  async processToolCalls(
    block: Workflow,
    toolCalls: ToolCallType[] | undefined,
    factory: ProcessorFactory,
  ): Promise<{
    toolResults: Record<string, any>;
    effects: ToolSideEffects;
  }> {
    const currentTransition = block.state.transition!;

    const effects: ToolSideEffects = {};
    let toolResults: Record<string, any> = {};

    if (!toolCalls) {
      return {
        effects,
        toolResults,
      };
    }

    try {
      if (toolCalls) {
        let i = 0;

        for (const toolCall of toolCalls) {
          this.logger.debug(
            `Call tool ${i} (${toolCall.tool}) on transition ${currentTransition.id}`,
          );

          const args = this.parseToolArguments(
            block,
            toolCall.tool,
            toolCall.args,
          );

          const toolBlock = await this.blockFactory.createBlock<
            Tool,
            ToolExecutionContextDto
          >(
            toolCall.tool,
            args,
            new ToolExecutionContextDto({
              ...block.ctx,
              workflow: block.state,
            }),
          );

          const resultDto = await this.blockProcessor.processBlock<Tool>(
            toolBlock,
            factory,
          );
          const toolCallResult: HandlerCallResult = resultDto.result;

          this.blockHelperService.assignToTargetBlock(
            toolCall.assign as AssignmentConfigType,
            block,
            resultDto,
          );

          if (toolCall.id) {
            toolResults[toolCall.id] = toolCallResult;
          }
          toolResults[i.toString()] = toolCallResult;

          block.state.currentTransitionResults = toolResults;

          if (toolCallResult.effects) {
            Object.assign(effects, toolCallResult.effects);

            // add documents early for timely updates in frontend
            // persisted with next loop iteration
            if (toolCallResult.effects.addWorkflowDocuments?.length) {
              block.state.addDocuments(
                toolCallResult.effects.addWorkflowDocuments,
              );
            }
          }

          i++;
        }
      }
    } catch (e) {
      // re-throw error if errors are not handled gracefully
      if (!currentTransition.onError) {
        throw e;
      }

      // set error place through manipulating effects
      Object.assign(effects, {
        setTransitionPlace: currentTransition.onError,
      } satisfies ToolSideEffects);

      // todo: add error info
      // this.addWorkflowTransitionData(
      //   workflowEntity,
      //   currentTransition.id!,
      //   'error',
      //   e.message,
      // );
    }

    return {
      effects,
      toolResults,
    };
  }

  async processStateMachine(
    workflowEntity: WorkflowEntity,
    block: Workflow,
    pendingTransitions: TransitionPayloadInterface[],
    factory: ProcessorFactory,
  ): Promise<Workflow> {
    const config = block.config as WorkflowType;
    if (!config.transitions) {
      throw new Error(`Workflow ${block.name} does not have any transitions.`);
    }

    let transitionResults: TransitionResultLookup = {};
    try {
      while (true) {
        this.logger.debug('------------ NEXT TRANSITION');

        const nextPendingTransition = pendingTransitions.shift();

        this.logger.debug(
          `next pending transition: ${nextPendingTransition?.id ?? 'none'}`,
        );

        this.updateAvailableTransitions(block);

        this.defineNextTransition(block, nextPendingTransition);

        // persist workflow for state and added documents of previous loop iteration
        this.blockHelperService.persistBlockState(workflowEntity, block.state);
        await this.workflowService.save(workflowEntity);

        const currentTransition = block.state.transition;

        // no more transitions?
        if (!currentTransition) {
          this.logger.debug('stop');
          break;
        }

        this.logger.debug(`Applying next transition: ${currentTransition.id}`);

        // get tool calls for transition
        const toolCalls = config.transitions!.find(
          (transition) => transition.id === currentTransition.id,
        )?.call;

        console.log(block.state);

        const { effects, toolResults } = await this.processToolCalls(
          block,
          toolCalls,
          factory,
        );

        transitionResults[currentTransition.id] = {
          toolResults,
        };

        // update the transition result object
        block.state.transitionResults = transitionResults;

        // apply the transition to next place
        this.commitWorkflowTransition(block, effects, currentTransition);
      }

      // update/add documents, if any. Only when no errors occurred
      this.blockHelperService.persistBlockState(workflowEntity, block.state);
    } catch (e) {
      this.logger.error(new ConfigTraceError(e, block));
      workflowEntity.errorMessage = e.message;
      workflowEntity.hasError = true;
    }

    if (workflowEntity.hasError) {
      workflowEntity.status = WorkflowState.Failed;
      block.state.error = true;
      block.state.stop = true;
    } else if (block.state.place === 'end') {
      workflowEntity.status = WorkflowState.Completed;
    } else {
      workflowEntity.status = WorkflowState.Waiting;
      block.state.stop = true;
    }

    await this.workflowService.save(workflowEntity);
    return block;
  }
}
