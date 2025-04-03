import { Injectable } from '@nestjs/common';
import { ConfigurationService, ToolRegistry } from '../../configuration';
import { ValueParserService } from './value-parser.service';
import {
  ContextInterface,
  ServiceConfigType, ToolApplicationInfo,
  ToolCallType, ToolResult,
  WorkflowData,
} from '@loopstack/shared';
import { DocumentEntity, WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';

@Injectable()
export class ToolExecutionService {
  constructor(
    private loopConfigService: ConfigurationService,
    private valueParserService: ValueParserService,
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
    data: WorkflowData | undefined,
    info: ToolApplicationInfo = {},
  ): Promise<ToolResult> {
    const callProps = this.parseCallProps(toolCall.props, {
      context,
      data,
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

    const result = await instance.apply(props, workflow, context, data, info);

    // create and add documents from action
    const documents: DocumentEntity[] = [];
    if (workflow && result.documents?.length) {
      for (const documentData of result.documents) {
        documents.push(
          this.documentService.create(workflow as WorkflowEntity, context, {
            ...documentData,
            transition: info.transition,
          }),
        );
      }
    }

    return result;
  }
}
