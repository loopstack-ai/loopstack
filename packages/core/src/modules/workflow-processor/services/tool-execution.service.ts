import { Injectable } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceConfigType,
  EvalContextInfo,
  ToolCallType,
  ToolResult,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ValueParserService } from '../../index';

@Injectable()
export class ToolExecutionService {
  constructor(
    private loopConfigService: ConfigurationService,
    private valueParserService: ValueParserService,
    private toolRegistry: ToolRegistry,
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
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    const toolConfig = this.getToolConfig(toolCall.tool);

    // replace the alias values with actual data
    const aliasDataObject = (workflow?.aliasData && workflow.currData) ? this.valueParserService.prepareAliasVariables(workflow.aliasData, workflow.currData) : {};

    const props = this.valueParserService.evalWithContextAndDataAndInfo(
      toolConfig.props,
      {
        context,
        data: workflow?.currData,
        tool: aliasDataObject,
        info,
      },
    );

    const data = toolConfig.data;

    const instance = this.toolRegistry.getToolByName(toolConfig.service);
    if (!instance) {
      throw new Error(`Tool service ${toolConfig.service} not found.`);
    }

    return instance.apply(props, data, workflow, context, info);
  }
}
