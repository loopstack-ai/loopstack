import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, SchemaRegistry } from '../../configuration';
import {
  ContextInterface,
  ToolConfigType,
  HandlerCallResult,
  ToolCallType,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { HandlerExecutionService } from './handler-execution.service';
import { ContextService } from '../../common';
import { HandlerCallType } from '@loopstack/shared/dist/schemas/handler-call.schema';
import { z } from 'zod';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private configurationService: ConfigurationService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private serviceExecutionService: HandlerExecutionService,
    private schemaRegistry: SchemaRegistry,
    private contextService: ContextService,
  ) {}

  isHandlerCallType(
    execute: HandlerCallType | ToolCallType,
  ): execute is HandlerCallType {
    return 'handler' in execute;
  }

  isToolCallType(
    execute: HandlerCallType | ToolCallType,
  ): execute is ToolCallType {
    return 'tool' in execute;
  }

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

    const configElement =
      this.configurationService.resolveConfig<ToolConfigType>(
        'tools',
        toolName,
        context.includes,
      );

    this.contextService.addIncludes(context, configElement.includes);

    const zodSchema = this.schemaRegistry.getZodSchema(`${configElement.key}.arguments`);

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

    let result: any;
    const executeItems: Array<HandlerCallType | ToolCallType> =
      configElement.config.execute;

    const extraVariables: Record<string, any> = {};
    for (const execute of executeItems) {
      result = undefined;

      if (this.isHandlerCallType(execute)) {
        result = await this.serviceExecutionService.callHandler(
          execute as HandlerCallType,
          toolCallArguments,
          workflow,
          context,
          transitionData,
          extraVariables,
        );
      } else if (this.isToolCallType(execute)) {
        result = await this.applyTool(
          execute as ToolCallType,
          toolCallArguments,
          workflow,
          context,
          transitionData,
          extraVariables,
        );
      }

      if (execute.as) {
        extraVariables[execute.as] = result?.data;
      }
    }

    return result;
  }
}
