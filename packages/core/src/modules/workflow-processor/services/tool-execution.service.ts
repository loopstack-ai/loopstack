import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceConfigType,
  WorkflowRunContext,
  ToolResult,
  SnippetConfigType,
  ToolCallType,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ValueParserService } from '../../index';
import { ToolSchemaValidatorService } from './tool-schema-validator.service';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private configurationService: ConfigurationService,
    private valueParserService: ValueParserService,
    private toolRegistry: ToolRegistry,
    private toolSchemaValidatorService: ToolSchemaValidatorService,
  ) {}

  getToolConfig(toolName: string) {
    const config = this.configurationService.get<ServiceConfigType>(
      'tools',
      toolName,
    );
    if (!config) {
      throw new Error(`Tool config with name ${toolName} not found.`);
    }

    return config;
  }

  async executeTool(name: string, args: any, workflow: WorkflowEntity | undefined, context: ContextInterface, workflowContext: WorkflowRunContext): Promise<ToolResult> {
    const { options, instance } = this.toolRegistry.getToolByName(name);

    const validProps = this.toolSchemaValidatorService.validateProps(
      options.schema,
      args,
    );

    this.logger.debug(`Calling tool ${name}`);

    return instance.apply(validProps, workflow, context, workflowContext);
  }

  async applyTool(
    handler: ToolCallType,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    const toolConfig = this.getToolConfig(handler.call);

    // replace the alias values with actual data
    const aliasVariables =
      workflow?.aliasData && workflow.currData
        ? this.valueParserService.prepareAliasVariables(
            workflow.aliasData,
            workflow.currData,
          )
        : {};

    const useTemplate = (name: string, variables: any): string => {
      const snippet = this.configurationService.get<SnippetConfigType>(
        'snippets',
        name,
      );
      if (!snippet) {
        return '';
      }

      return this.valueParserService.evalWithContextVariables(
        snippet.value,
        variables,
      );
    };

    const props = this.valueParserService.evalWithContextVariables(
      toolConfig.props,
      {
        ...aliasVariables,
        useTemplate,
        context,
        data: workflow?.currData,
        workflow: workflowContext,
        arguments: handler.args
      },
    );

    return this.executeTool(toolConfig.service, props, workflow, context, workflowContext);
  }

  commitToolCallResult(
    workflow: WorkflowEntity,
    transition: string,
    tool: string,
    alias: string | undefined,
    result: ToolResult | undefined,
  ) {
    if (result?.workflow) {
      workflow = result?.workflow;
    }

    if (result?.data) {
      if (!workflow.currData) {
        workflow.currData = {};
      }

      if (!workflow.currData[transition]) {
        workflow.currData[transition] = {};
      }

      workflow.currData[transition][tool] = result.data;
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
