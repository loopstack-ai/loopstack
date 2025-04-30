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
import { ConfigValueParserService, DocumentService } from '../../index';

@Injectable()
export class ToolExecutionService {
  constructor(
    private loopConfigService: ConfigurationService,
    private valueParserService: ConfigValueParserService,
    private toolRegistry: ToolRegistry,
    private documentService: DocumentService,
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

    const props = this.valueParserService.evalWithContextAndDataAndInfo(
      toolConfig.props,
      {
        context,
        data: workflow?.currData,
        info,
      },
    );

    const instance = this.toolRegistry.getToolByName(toolConfig.service);
    if (!instance) {
      throw new Error(`Tool service ${toolConfig.service} not found.`);
    }

    const result = await instance.apply(props, workflow, context, info);

    // create and add documents from tool result
    // todo: move into actual tool?
    if (workflow && result.data?.document) {
      this.documentService.create(workflow as WorkflowEntity, context, {
        ...result.data.document,
        transition: info.transition,
      });
    }

    return result;
  }
}
