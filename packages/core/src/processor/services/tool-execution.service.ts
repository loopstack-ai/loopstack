import { Injectable } from '@nestjs/common';
import { ToolWrapperCollectionService } from '../../configuration/services/tool-wrapper-collection.service';
import { ToolRegistry } from './tool.registry';
import _ from 'lodash';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import { ValueParserService } from './value-parser.service';
import { ToolCallDefaultType, ToolConfigDefaultType } from '../schemas/tool-config.schema';

@Injectable()
export class ToolExecutionService {
  constructor(
    private toolWrapperCollectionService: ToolWrapperCollectionService,
    private toolRegistry: ToolRegistry,
    private valueParserService: ValueParserService,
  ) {}

  async applyToolWrapper(
    toolWrapper: ToolConfigDefaultType,
    contextArgs: Record<string, any>,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface> {
    const paramKeys = toolWrapper.params
      ? _.map(toolWrapper.params, 'name')
      : [];
    const args: Record<string, any> = _.pick(contextArgs, paramKeys);

    return this.applyTools(toolWrapper.execute, target, source, args);
  }

  private prepareArgs(
    args: Record<string, any> | undefined,
    source: ProcessStateInterface,
    contextArgs?: Record<string, any>,
  ): Record<string, any> {
    return args
      ? this.valueParserService.parseObjectValues(args, {
          ...source,
          args: contextArgs,
        })
      : {};
  }

  async applyTool(
    toolCall: ToolCallDefaultType,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
    contextArgs?: Record<string, any>,
  ): Promise<ProcessStateInterface> {
    const args = this.prepareArgs(toolCall.args, source, contextArgs);

    const instance = this.toolRegistry.getToolByName(toolCall.tool);
    if (instance) {
      return instance.apply(args, target, source);
    }

    const wrapper = this.toolWrapperCollectionService.getByName(toolCall.tool);
    if (wrapper) {
      return this.applyToolWrapper(wrapper, args, target, source);
    }

    throw new Error(`Tool or Wrapper with name "${toolCall.tool}" not found.`);
  }

  async applyTools(
    executions: ToolCallDefaultType[] | undefined,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
    args?: Record<string, any>,
  ): Promise<ProcessStateInterface> {
    if (!executions?.length) {
      return target;
    }

    for (const item of executions) {
      target = await this.applyTool(item, target, source, args);
    }

    return target;
  }
}
