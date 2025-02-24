import { Injectable } from '@nestjs/common';
import { UtilCollectionService } from '../../configuration/services/util-collection.service';
import {
  UtilCallConfigInterface,
  UtilConfigInterface,
} from '@loopstack/shared';
import { FunctionsRegistry } from '../../tools/registry/functions.registry';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ResultInterface } from '../interfaces/result.interface';
import { ValueParserService } from './value-parser.service';

@Injectable()
export class FunctionCallService {
  constructor(
    private utilCollectionService: UtilCollectionService,
    private functionsRegistry: FunctionsRegistry,
    private valueParserService: ValueParserService,
  ) {}

  private applyUtil(
    util: UtilConfigInterface,
    contextArgs: Record<string, any>,
    target: ContextInterface,
    context: ContextInterface,
  ): ResultInterface {
    const paramKeys = util.params ? _.map(util.params, 'name') : [];
    const args: Record<string, any> = _.pick(contextArgs, paramKeys);

    return this.applyFunctions(util.execute, target, context, args);
  }

  private prepareArgs(
    args: Record<string, any> | undefined,
    context: ContextInterface,
    contextArgs?: Record<string, any>,
  ): Record<string, any> {
    return args
      ? this.valueParserService.parseObjectValues(args, {
          context,
          args: contextArgs,
        })
      : {};
  }

  private applyFunction(
    functionCall: UtilCallConfigInterface,
    target: ContextInterface,
    context: ContextInterface,
    contextArgs?: Record<string, any>,
  ): ResultInterface {
    const args = this.prepareArgs(functionCall.args, context, contextArgs);

    const functionInstance = this.functionsRegistry.getFunctionByName(
      functionCall.function,
    );
    if (functionInstance) {
      return functionInstance.apply(args, target, context);
    }

    const util = this.utilCollectionService.getByName(functionCall.function);
    if (util) {
      return this.applyUtil(util, args, target, context);
    }

    throw new Error(
      `Function or Util with name "${functionCall.function}" not found.`,
    );
  }

  applyFunctions(
    executions: UtilCallConfigInterface[] | undefined,
    target: ContextInterface,
    context: ContextInterface,
    args?: Record<string, any>,
  ) {
    let result: { context: ContextInterface } = { context: target };
    if (executions?.length) {
      for (const item of executions) {
        result = this.applyFunction(item, result.context, context, args);
      }
    }
    return result;
  }
}
