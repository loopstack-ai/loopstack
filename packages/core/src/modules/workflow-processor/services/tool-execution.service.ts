import { Injectable, Logger } from '@nestjs/common';
import { BlockRegistryService } from '../../configuration';
import {
  ContextInterface,
  HandlerCallResult,
  ToolCallType,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
  ) {}

  async applyTool(
    toolCall: ToolCallType,
    parentArguments: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    templateVariables: Record<string, any>,
  ): Promise<HandlerCallResult> {
    this.logger.debug(
      `Tool ${toolCall.tool} called with arguments`,
      toolCall.arguments,
    );
    this.logger.debug(`Parent Arguments:`, parentArguments);

    const toolName = this.templateExpressionEvaluatorService.parse<string>(
      toolCall.tool,
      {
        ...templateVariables,
        arguments: parentArguments,
        context,
        workflow,
        transition: transitionData,
      },
      {
        schema: z.string(),
      },
    );

    const block = this.blockRegistryService.getBlock(toolName);
    if (!block) {
      throw new Error(`Block with name ${toolName} not found.`)
    }

    try {
      const zodSchema: z.ZodType | undefined = block.metadata.paramsSchema;

      const hasArguments =
        toolCall.arguments && Object.keys(toolCall.arguments).length;

      if (!zodSchema && hasArguments) {
        throw Error(`Tool called with arguments but no schema defined.`);
      }

      const toolCallArguments = hasArguments
        ? this.templateExpressionEvaluatorService.parse<ToolCallType>(
          toolCall.arguments,
          {
            ...templateVariables,
            arguments: parentArguments,
            context,
            workflow,
            transition: transitionData,
          },
          {
            schema: zodSchema,
          },
        )
        : {};

      let result: HandlerCallResult = block.provider.instance.apply(
        toolCallArguments,
        workflow,
        context,
        transitionData,
        parentArguments,
      );
      if (!result) {
        throw new Error(`Tool execution provided no results.`);
      }

      return result;
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }
  }
}
