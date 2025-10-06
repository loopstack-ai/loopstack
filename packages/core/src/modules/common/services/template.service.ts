import { Injectable } from '@nestjs/common';
import { ObjectExpressionHandler } from './expression-handler/object-expression.handler';
import { TemplateExpressionHandler } from './expression-handler/template-expression.handler';
import { Block } from '../../workflow-processor/abstract/block.abstract';

export interface TemplateDetector {
  canHandle(value: any): boolean;
}

export interface TemplateProcessor {
  process(value: string, variables: Record<string, any>): any;
}

@Injectable()
export class TemplateService {
  private readonly handlers: ReadonlyArray<
    TemplateDetector & TemplateProcessor
  >;

  constructor(
    private templateExpressionHandler: TemplateExpressionHandler,
    private objectExpressionHandler: ObjectExpressionHandler,
  ) {
    this.handlers = Object.freeze([
      this.objectExpressionHandler, // ${ } expressions for arguments and schema validated types
      this.templateExpressionHandler, // {{ }} expressions for templates and string result
    ]);
  }

  /**
   * Evaluates a value using the appropriate template handler
   */
  evaluate(value: any, ctx: Record<string, Block>,): any {
    // only handle string values
    if (value == null || typeof value !== 'string') {
      return value;
    }

    // select the appropriate handler
    for (const handler of this.handlers) {
      if (handler.canHandle(value)) {
        return handler.process(value, ctx);
      }
    }

    // return the raw value if no handler was found
    return value;
  }

  /**
   * Recursively evaluates template expressions in objects and arrays
   */
  evaluateDeep<T = any>(obj: any, ctx: Record<string, Block>,): T {
    if (obj == null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => {
        return this.evaluateDeep(item, ctx);
      }) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.evaluateDeep(value, ctx);
      }
      return result as T;
    }

    return this.evaluate(obj, ctx) as T;
  }
}
