import { Injectable } from '@nestjs/common';
import { ToolWrapperCollectionService } from '../../configuration/services/tool-wrapper-collection.service';
import { ToolRegistry } from '../../tools/registry/tool.registry';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ResultInterface } from '../interfaces/result.interface';
import { ValueParserService } from './value-parser.service';
import {ToolWrapperConfigInterface} from "@loopstack/shared/dist/schemas/toolWrapperSchema";
import {ToolCallConfigInterface} from "@loopstack/shared";

@Injectable()
export class ToolExecutionService {
  constructor(
    private toolWrapperCollectionService: ToolWrapperCollectionService,
    private toolRegistry: ToolRegistry,
    private valueParserService: ValueParserService,
  ) {}

  private applyToolWrapper(
    toolWrapper: ToolWrapperConfigInterface,
    contextArgs: Record<string, any>,
    target: ContextInterface,
    source: ResultInterface,
  ): ResultInterface {
    const paramKeys = toolWrapper.params ? _.map(toolWrapper.params, 'name') : [];
    const args: Record<string, any> = _.pick(contextArgs, paramKeys);

    return this.applyTools(toolWrapper.execute, target, source, args);
  }

  private prepareArgs(
    args: Record<string, any> | undefined,
    source: ResultInterface,
    contextArgs?: Record<string, any>,
  ): Record<string, any> {
    return args
      ? this.valueParserService.parseObjectValues(args, {
          ...source,
          args: contextArgs,
        })
      : {};
  }

  private applyTool(
    toolCall: ToolCallConfigInterface,
    target: ContextInterface,
    source: ResultInterface,
    contextArgs?: Record<string, any>,
  ): ResultInterface {
    const args = this.prepareArgs(toolCall.args, source, contextArgs);

    const instance = this.toolRegistry.getToolByName(toolCall.tool);
    if (instance) {
      return instance.apply(args, target, source);
    }

    const wrapper = this.toolWrapperCollectionService.getByName(toolCall.tool);
    if (wrapper) {
      return this.applyToolWrapper(wrapper, args, target, source);
    }

    throw new Error(
      `Tool or Wrapper with name "${toolCall.tool}" not found.`,
    );
  }

  applyTools(
    executions: ToolCallConfigInterface[] | undefined,
    target: ContextInterface,
    source: ResultInterface,
    args?: Record<string, any>,
  ) {
    let result: { context: ContextInterface } = { context: target };
    if (executions?.length) {
      for (const item of executions) {
        result = this.applyTool(item, result.context, source, args);
      }
    }
    return result;
  }
}
