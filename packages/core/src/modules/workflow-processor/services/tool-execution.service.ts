import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceConfigType,
  WorkflowRunContext,
  ToolResult, SnippetConfigType,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ValueParserService } from '../../index';
import { ToolSchemaValidatorService } from './tool-schema-validator.service';
import { ToolCallType } from '@loopstack/shared/dist/schemas/tool-call.schema';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private loopConfigService: ConfigurationService,
    private valueParserService: ValueParserService,
    private toolRegistry: ToolRegistry,
    private toolSchemaValidatorService: ToolSchemaValidatorService,
  ) {}

  getToolConfig(toolName: string) {
    const config = this.loopConfigService.get<ServiceConfigType>(
      'tools',
      toolName,
    );
    if (!config) {
      throw new Error(`Tool config with name ${toolName} not found.`);
    }

    return config;
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

    const useSnippet = (name: string, variables: any): string => {
      const snippet = this.loopConfigService.get<SnippetConfigType>('snippets', name);
      if (!snippet) {
        return '';
      }

      return this.valueParserService.evalWithContextAndDataAndInfo(snippet.value, variables);
    }

    const props = this.valueParserService.evalWithContextAndDataAndInfo(
      toolConfig.props,
      {
        ...aliasVariables,
        useSnippet,
        context,
        data: workflow?.currData,
        workflow: workflowContext,
      },
    );

    const instance = this.toolRegistry.getToolByName(toolConfig.service);
    if (!instance) {
      throw new Error(`Tool service ${toolConfig.service} not found.`);
    }

    const validProps = this.toolSchemaValidatorService.validateProps(
      instance,
      props,
    );
    return instance.apply(validProps, workflow, context, workflowContext);
  }
}
