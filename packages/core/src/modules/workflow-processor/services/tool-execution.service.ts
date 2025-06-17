import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, ServiceRegistry } from '../../configuration';
import {
  ContextInterface,
  ToolConfigType,
  ServiceCallResult,
  ToolCallType,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ToolSchemaValidatorService } from './tool-schema-validator.service';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { SchemaValidatorService } from '../../common';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private configurationService: ConfigurationService,
    private serviceRegistry: ServiceRegistry,
    private toolSchemaValidatorService: ToolSchemaValidatorService,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private schemaValidatorService: SchemaValidatorService,
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

  async callService(
    name: string,
    args: any,
    workflow?: WorkflowEntity,
    context?: ContextInterface,
    transitionData?: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    const { options, instance } = this.serviceRegistry.getServiceByName(name);

    const parsedArgs = this.toolSchemaValidatorService.validateProps(
      options.schema,
      args,
    );

    this.logger.debug(`Calling service ${name}`);

    return instance.apply(parsedArgs, workflow, context, transitionData);
  }

  async applyTool(
    handler: ToolCallType,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    const toolConfig = this.getToolConfig(handler.tool);

    // validate the tool call arguments
    if (toolConfig.parameters) {
      this.schemaValidatorService.validate(
        handler.arguments,
        toolConfig.parameters,
      );
    }

    // parse service execution arguments
    const args = this.templateExpressionEvaluatorService.evaluate(
      toolConfig.execute.arguments,
      handler.arguments,
      context,
      workflow,
      transitionData,
    );

    // call the service
    return this.callService(
      toolConfig.execute.service,
      args,
      workflow,
      context,
      transitionData,
    );
  }

  addWorkflowTransitionData(
    workflow: WorkflowEntity,
    transition: string,
    target: string,
    data: any,
  ) {
    if (!workflow.currData) {
      workflow.currData = {};
    }

    if (!workflow.currData[transition]) {
      workflow.currData[transition] = {};
    }

    workflow.currData[transition][target] = data;
  }

  commitServiceCallResult(
    workflow: WorkflowEntity,
    transition: string,
    tool: string,
    alias: string | undefined,
    result: ServiceCallResult | undefined,
  ) {
    if (result?.workflow) {
      workflow = result?.workflow;
    }

    if (result?.data) {
      this.addWorkflowTransitionData(workflow, transition, tool, result.data);
    }

    if (alias) {
      const currAlias = workflow.aliasData ?? {};
      workflow.aliasData = {
        ...currAlias,
        [alias]: [transition, tool],
      };
    }

    return workflow;
  }
}
