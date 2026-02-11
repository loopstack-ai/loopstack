import { Injectable } from '@nestjs/common';
import { JexlExpressionHandler } from './expression-handler/jexl-expression.handler';
import { TemplateExOptions, TemplateExpressionHandler } from './expression-handler/template-expression.handler';

export interface TemplateDetector {
  canHandle(value: unknown): boolean;
}

export interface TemplateProcessor {
  process(value: string, data: Record<string, unknown>, options?: TemplateExOptions): unknown;
}

@Injectable()
export class TemplateService {
  private readonly handlers: ReadonlyArray<TemplateDetector & TemplateProcessor>;

  constructor(
    private templateExpressionHandler: TemplateExpressionHandler,
    // private objectExpressionHandler: ObjectExpressionHandler,
    private jexlExpressionHandler: JexlExpressionHandler,
  ) {
    this.handlers = Object.freeze([
      this.jexlExpressionHandler, // ${{ }} expressions for powerful JEXL evaluations
      // this.objectExpressionHandler, // ${ } expressions for arguments and schema validated types
      this.templateExpressionHandler, // {{ }} expressions for templates and string result
    ]);
  }

  /**
   * Evaluates a value using the appropriate template handler
   */
  evaluate(value: unknown, data: Record<string, unknown>, options?: TemplateExOptions): unknown {
    // only handle string values
    if (value == null || typeof value !== 'string') {
      return value;
    }

    // select the appropriate handler
    for (const handler of this.handlers) {
      if (handler.canHandle(value)) {
        return handler.process(value, data, options);
      }
    }

    // return the raw value if no handler was found
    return value;
  }

  /**
   * Recursively evaluates template expressions in objects and arrays
   */
  evaluateDeep<T = unknown>(obj: unknown, data: Record<string, unknown>, options?: TemplateExOptions): T {
    if (obj == null) {
      return obj as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => {
        return this.evaluateDeep(item, data, options);
      }) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.evaluateDeep(value, data, options);
      }
      return result as T;
    }

    return this.evaluate(obj, data, options) as T;
  }
}
