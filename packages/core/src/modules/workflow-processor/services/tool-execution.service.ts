import { Injectable } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceConfigType,
  ToolApplicationInfo,
  ToolCallType,
  ToolResult,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { ConfigValueParserService, DocumentService } from '../../index';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';

@Injectable()
export class ToolExecutionService {
  constructor(
    private loopConfigService: ConfigurationService,
    private valueParserService: ConfigValueParserService,
    private toolRegistry: ToolRegistry,
    private documentService: DocumentService,
  ) {}

  private parseCallProps(
    props: Record<string, any> | undefined,
    variables: any,
  ): Record<string, any> {
    return props
      ? this.valueParserService.parseObjectValues(props, variables)
      : {};
  }

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
    info: StateMachineInfoDto,
  ): Promise<ToolResult> {
    const callProps = this.parseCallProps(toolCall.props, {
      context,
      data: workflow?.currData,
      info,
    });

    const toolConfig = this.getToolConfig(toolCall.tool);

    // merge config props will call props
    const props = {
      ...(toolConfig?.props ?? {}),
      ...callProps,
    };

    const instance = this.toolRegistry.getToolByName(toolConfig.service);
    if (!instance) {
      throw new Error(`Tool service ${toolConfig.service} not found.`);
    }

    const result = await instance.apply(props, workflow, context, info);

    // create and add documents from tool result
    // todo: move into actual tool?
    if (workflow && result.data.documents?.length) {
      for (const documentData of result.data.documents) {
        this.documentService.create(workflow as WorkflowEntity, context, {
          ...documentData,
          transition: info.transitionInfo!.transition,
        });
      }
    }

    return result;
  }
}
