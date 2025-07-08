import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, SchemaRegistry } from '../../configuration';
import {
  ContextInterface,
  ToolConfigType,
  ServiceCallResult,
  ToolCallType,
  TransitionMetadataInterface,
  ConfigElement,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { ServiceExecutionService } from './service-execution.service';
import { ContextService } from '../../common';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private configurationService: ConfigurationService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private serviceExecutionService: ServiceExecutionService,
    private schemaRegistry: SchemaRegistry,
    private contextService: ContextService,
  ) {}

  async applyTool(
    toolCall: ToolCallType,
    parentArguments: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    this.logger.debug(
      `Tool ${toolCall.tool} called with arguments`,
      toolCall.arguments,
    );
    this.logger.debug(`Parent Arguments:`, parentArguments);

    const configElement =
      this.configurationService.resolveConfig<ToolConfigType>(
        'tools',
        toolCall.tool,
        context.includes,
      );

    this.contextService.addIncludes(context, configElement.importMap);

    const zodSchema = this.schemaRegistry.getZodSchema(
      `${configElement.name}.arguments`,
    );

    const hasArguments =
      toolCall.arguments && Object.keys(toolCall.arguments).length;
    if (!zodSchema && hasArguments) {
      throw Error(`Tool called with arguments but no schema defined.`);
    }

    const toolCallArguments = hasArguments
      ? this.templateExpressionEvaluatorService.parse<ToolCallType>(
          toolCall.arguments,
          {
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

    return this.serviceExecutionService.callService(
      configElement.config.execute,
      toolCallArguments,
      workflow,
      context,
      transitionData,
    );
  }
}
