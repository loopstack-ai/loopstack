import { Injectable, Logger } from '@nestjs/common';
import { HandlerCallResult, ToolSideEffects } from '@loopstack/common';
import { AssignmentConfigType, ToolCallType } from '@loopstack/contracts/types';

import { BlockHelperService } from './block-helper.service';
import { BlockProcessor } from './block-processor.service';
import { BlockRegistryService } from './block-registry.service';
import { BlockFactory } from './block.factory';
import { Tool, Workflow } from '../abstract';
import { ProcessorFactory } from './processor.factory';
import {
  TemplateExpressionEvaluatorService,
  ToolExecutionContextDto,
} from '../../common';

@Injectable()
export class StateMachineToolCallProcessorService {
  private readonly logger = new Logger(
    StateMachineToolCallProcessorService.name,
  );

  constructor(
    private readonly blockHelperService: BlockHelperService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
  ) {}

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

  private validateToolAvailable(toolName, parentBlock: Workflow) {
    if (!parentBlock.metadata.imports.some((item) => item.name === toolName)) {
      throw new Error(
        `Tool ${toolName} is not available. Make sure to import required tools to the workflow.`,
      );
    }
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

          this.validateToolAvailable(toolCall.tool, block);

          const args = this.parseToolArguments(
            block,
            toolCall.tool,
            toolCall.args,
          );

          let toolBlock = await this.blockFactory.createBlock<
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

          toolBlock = await this.blockProcessor.processBlock<Tool>(
            toolBlock,
            factory,
          );
          const toolCallResult: HandlerCallResult = toolBlock.result;

          this.blockHelperService.assignToTargetBlock(
            toolCall.assign as AssignmentConfigType,
            block,
            toolBlock,
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
}
