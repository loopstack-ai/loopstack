import { Injectable } from '@nestjs/common';
import { ToolCollectionService, ToolRegistry } from '../../configuration';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { ValueParserService } from './value-parser.service';
import { ToolCallType } from '../../configuration/schemas/tool-config.schema';

@Injectable()
export class ToolExecutionService {
  constructor(
    private toolWrapperCollectionService: ToolCollectionService,
    private valueParserService: ValueParserService,
    private toolRegistry: ToolRegistry,
  ) {}

  private parseCallProps(
    props: Record<string, any> | undefined,
    source: ProcessStateInterface,
  ): Record<string, any> {
    return props
      ? this.valueParserService.parseObjectValues(props, { ...source })
      : {};
  }

  getToolConfig(toolName: string) {
    const config = this.toolWrapperCollectionService.getByName(toolName);
    if (!config) {
      throw new Error(`Tool config with name ${toolName} not found.`);
    }

    return config;
  }

  async applyTool(
    toolCall: ToolCallType,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const callProps = this.parseCallProps(toolCall.props, source);

    const toolConfig = this.getToolConfig(toolCall.tool);

    // merge config props will call props
    const props = {
      ...(toolConfig?.props ?? {}),
      ...callProps
    }

    const instance = this.toolRegistry.getToolByName(toolConfig.service);
    if (!instance) {
      throw new Error(`Tool service ${toolConfig.service} not found.`);
    }

    return instance.apply(props, target, source);
  }

  async applyTools(
    executions: ToolCallType[] | undefined,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    if (!executions?.length) {
      return target;
    }

    for (const item of executions) {
      target = await this.applyTool(item, target, source);
    }

    return target;
  }
}
