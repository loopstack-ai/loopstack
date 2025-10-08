import { Injectable, Logger } from '@nestjs/common';
import { BlockRegistryService } from '../../configuration';
import {
  HandlerCallResult,
  ToolCallType,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';
import { Workflow, Tool } from '../abstract';
import { ServiceStateFactory } from './service-state-factory.service';
import { ToolResultLookup, TransitionResultLookup } from './state-machine-processor.service';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly serviceStateFactory: ServiceStateFactory,
  ) {}

  async applyTool(
    toolCall: ToolCallType,
    stateMachineBlock: Workflow,
    workflow: WorkflowEntity | undefined,
    toolResults: ToolResultLookup,
    transitionResults: TransitionResultLookup,
  ): Promise<Tool> {
    this.logger.debug(
      `Tool ${toolCall.tool} called with arguments`,
      toolCall.args,
    );
    this.logger.debug(`Parent Arguments:`, stateMachineBlock.args);

    const toolName = this.templateExpressionEvaluatorService.parse<string>(
      toolCall.tool,
      {
        workflow: stateMachineBlock.toOutputObject(),
        toolResults,
        transitionResults,
      },
      {
        schema: z.string(),
      },
    );
    const blockRegistryItem = this.blockRegistryService.getBlock(toolName);
    if (!blockRegistryItem) {
      throw new Error(`Block with name ${toolName} not found.`)
    }
    const block = await this.serviceStateFactory.createBlockInstance<Tool>(blockRegistryItem,{
      ...stateMachineBlock.context,
    });

    try {
      const zodSchema: z.ZodType | undefined = block.metadata.properties;

      const hasArguments =
        toolCall.args && Object.keys(toolCall.args).length;

      if (!zodSchema && hasArguments) {
        throw Error(`Tool called with arguments but no schema defined.`);
      }

      const toolCallArguments = hasArguments
        ? this.templateExpressionEvaluatorService.parse<ToolCallType>(
          toolCall.args,
          {
            workflow: stateMachineBlock.toOutputObject(),
            this: block.toOutputObject(),
            toolResults,
            transitionResults,
          },
          {
            schema: zodSchema,
          },
        )
        : {};

      block.initTool(
        toolCallArguments,
        stateMachineBlock.currentTransition!,
      )

      let result: HandlerCallResult = await block.apply(
        toolCallArguments,
        workflow!,
      );
      if (!result) {
        throw new Error(`Tool execution provided no results.`);
      }

      block.result = result;

      return block;
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }
  }
}
