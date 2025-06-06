import { Injectable } from '@nestjs/common';
import { ExpressionEvaluatorService } from './expression-evaluator.service';
import {
  ContextInterface,
} from '@loopstack/shared';
import { get, transform } from 'lodash';
import { TemplateEngineService } from './template-engine.service';

@Injectable()
export class ValueParserService {
  constructor(
    private expressionEvaluatorService: ExpressionEvaluatorService,
    private templateEngineService: TemplateEngineService,
  ) {}

  evalObjectLeafs<T>(obj: T, variables: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return this.expressionEvaluatorService.isExpression(obj)
        ? this.expressionEvaluatorService.evaluate(obj, variables)
        : (this.templateEngineService.evaluate(obj, variables) as unknown as T);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.evalObjectLeafs(item, variables),
      ) as unknown as T;
    }

    const result = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.evalObjectLeafs(obj[key], variables);
      }
    }

    return result;
  }

  prepareAliasVariables(
    aliasReference: Record<string, any>,
    dataSource: Record<string, any>,
  ): Record<string, any> {
    return aliasReference
      ? transform(
          aliasReference,
          (result: Record<string, any>, path: string[], key: string) => {
            const document = get(dataSource, path);
            result[key] = document?.content;
          },
          {},
        )
      : {};
  }

  evalWithContext<T>(obj: any, variables: { context: ContextInterface }): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }
  evalWithContextAndItem<T extends {}>(
    obj: any,
    variables: { context: ContextInterface; item: string; index: number },
  ): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }

  evalWithContextVariables<T>(obj: any, variables: any): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }
}
