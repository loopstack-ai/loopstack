import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '../../configuration';
import {
  ContextInterface,
  ToolConfigType,
  ServiceCallResult,
  ToolCallType,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { ServiceExecutionService } from './service-execution.service';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private configurationService: ConfigurationService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private serviceExecutionService: ServiceExecutionService,
  ) {}

  getToolConfig(toolName: string) {
    const config = this.configurationService.get<ToolConfigType>(
      'tools',
      toolName,
    );
    if (!config) {
      throw new Error(`Tool config with name ${toolName} not found.`);
    }

    return config;
  }

  async applyTool(
    toolCall: ToolCallType,
    parentArguments: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {

    this.logger.debug(`Tool ${toolCall.tool} called with arguments`, toolCall.arguments);
    this.logger.debug(`Parent Arguments:`, parentArguments);

    const toolConfig = this.getToolConfig(toolCall.tool);

    const toolCallArgumentsSchemaPath = toolConfig.parameters ? `custom.tools.arguments.${toolConfig.name}` : null;

    const toolCallArguments = toolCall.arguments ?
      this.templateExpressionEvaluatorService.parse<ToolCallType>(
        toolCall.arguments,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
        {
          schemaPath: toolCallArgumentsSchemaPath,
        },
      ) : {};

    return this.serviceExecutionService.callService(
      toolConfig.execute,
      toolCallArguments,
      workflow,
      context,
      transitionData,
    );
  }
}
