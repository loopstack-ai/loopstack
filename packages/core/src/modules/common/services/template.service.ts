import { Injectable } from '@nestjs/common';
import { ObjectExpressionHandler } from './expression-handler/object-expression.handler';
import { TemplateExpressionHandler } from './expression-handler/template-expression.handler';

export interface TemplateDetector {
  canHandle(value: any): boolean;
}

export interface TemplateProcessor {
  process(value: any, variables: Record<string, any>): any;
}

@Injectable()
export class TemplateService {
  private readonly handlers: ReadonlyArray<TemplateDetector & TemplateProcessor>;

  constructor(
    private objectExpressionHandler: ObjectExpressionHandler,
    private templateExpressionHandler: TemplateExpressionHandler,
  ) {
    this.handlers = Object.freeze([
      this.objectExpressionHandler,      // Most specific: complete ${} expressions
      this.templateExpressionHandler,    // Mixed content with ${} expressions
    ]);
  }

  /**
   * Evaluates a value using the appropriate template handler
   * @param value The value to evaluate
   * @param variables The variables to use in template evaluation
   * @returns The processed value or the original value if no handler can process it
   */
  evaluate(value: any, variables: Record<string, any>): any {
    // Early return for non-processable values
    if (value == null || typeof value !== 'string') {
      return value;
    }

    for (const handler of this.handlers) {
      if (handler.canHandle(value)) {
        return handler.process(value, variables);
      }
    }

    return value;
  }

  /**
   * Recursively evaluates template expressions in objects and arrays
   * @param obj The object/array to process
   * @param variables The variables to use in template evaluation
   * @returns The processed object/array
   */
  evaluateDeep<T = any>(obj: any, variables: Record<string, any>): T {
    if (obj == null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.evaluateDeep(item, variables)) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.evaluateDeep(value, variables);
      }
      return result as T;
    }

    return this.evaluate(obj, variables) as T;
  }

  /**
   * Checks if a value contains any template expressions
   * @param value The value to check
   * @returns true if the value contains template expressions
   */
  hasTemplateExpressions(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return this.handlers.some(handler => handler.canHandle(value));
  }
}