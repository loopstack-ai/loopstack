import { Injectable } from '@nestjs/common';
import { UtilCollectionService } from '../../configuration/services/util-collection.service';
import {
  UtilCallConfigInterface,
  UtilConfigInterface,
} from '@loopstack/shared';
import { FunctionsRegistry } from '../../tools/registry/functions.registry';
import { ContextInterface } from '../interfaces/context.interface';
import { TemplateEngineService } from './template-engine.service';
import _ from 'lodash';
import { ResultInterface } from '../interfaces/result.interface';

@Injectable()
export class FunctionCallService {
  constructor(
    private utilCollectionService: UtilCollectionService,
    private functionsRegistry: FunctionsRegistry,
    private templateEngineService: TemplateEngineService,
  ) {}

  applyUtil(
    util: UtilConfigInterface,
    props: Record<string, any>,
    context: ContextInterface,
  ): ResultInterface {
    const argKeys = util.args ? _.map(util.args, 'name') : [];
    const args: Record<string, any> = _.pick(props, argKeys);

    return this.applyFunctions(util.execute, context, args);
  }

  applyFunctions(
    executions: UtilCallConfigInterface[],
    context: ContextInterface,
    args?: Record<string, any>,
  ) {
    let result: { context: ContextInterface } = { context };
    if (executions?.length) {
      for (const item of executions) {
        result = this.applyFunction(item, result.context, args);
      }
    }
    return result;
  }

  prepareProps(
    props: Record<string, any> | undefined,
    context: ContextInterface,
    args?: Record<string, any>,
  ): Record<string, any> {
    return props
      ? this.templateEngineService.parseObjectValues(props, { context, args })
      : {};
  }

  applyFunction(
    payload: UtilCallConfigInterface,
    context: ContextInterface,
    args?: Record<string, any>,
  ): ResultInterface {
    const props = this.prepareProps(payload.props, context, args);

    const functionInstance = this.functionsRegistry.getFunctionByName(
      payload.function,
    );
    if (functionInstance) {
      return functionInstance.apply(props, context);
    }

    const util = this.utilCollectionService.getByName(payload.function);
    if (util) {
      return this.applyUtil(util, props, context);
    }

    throw new Error(
      `Function or Util with name "${payload.function}" not found.`,
    );
  }
}
