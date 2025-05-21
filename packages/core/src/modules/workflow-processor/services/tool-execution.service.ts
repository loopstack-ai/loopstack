import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceConfigType,
  WorkflowRunContext,
  ToolCallType,
  ToolResult, SnippetConfigType,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ValueParserService } from '../../index';
import { ToolSchemaValidatorService } from './tool-schema-validator.service';

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
    toolCall: ToolCallType,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    workflowContext: WorkflowRunContext,
  ): Promise<ToolResult> {
    const toolConfig = this.getToolConfig(toolCall.tool);

    // replace the alias values with actual data
    const aliasDataObject =
      workflow?.aliasData && workflow.currData
        ? this.valueParserService.prepareAliasVariables(
            workflow.aliasData,
            workflow.currData,
          )
        : {};

    const snippets: Record<string, string> = this.loopConfigService.getAll<SnippetConfigType>('snippets').reduce((obj, snippet) => {
      obj[snippet.name] = snippet.value;
      return obj;
    }, {});

    const props = this.valueParserService.evalWithContextAndDataAndInfo(
      toolConfig.props,
      {
        snippets,
        context,
        data: workflow?.currData,
        tool: aliasDataObject,
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
