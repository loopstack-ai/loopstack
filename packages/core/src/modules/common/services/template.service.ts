import { Injectable } from '@nestjs/common';
import { ObjectExpressionHandler } from './expression-handler/object-expression.handler';
import { TemplateExpressionHandler } from './expression-handler/template-expression.handler';

export interface TemplateDetector {
  canHandle(value: any): boolean;
}

export interface TemplateProcessor {
  process(value: any, path: string | null, variables: Record<string, any>, secure: boolean): any;
}

@Injectable()
export class TemplateService {
  private readonly handlers: ReadonlyArray<TemplateDetector & TemplateProcessor>;

  constructor(
    private objectExpressionHandler: ObjectExpressionHandler,
    private templateExpressionHandler: TemplateExpressionHandler,
  ) {
    this.handlers = Object.freeze([
      this.objectExpressionHandler,      // ${{ }} expressions for arguments and schema validated types
      this.templateExpressionHandler,    // {{ }} expressions for templates and string result
    ]);
  }

  /**
   * Evaluates a value using the appropriate template handler
   */
  private evaluate(value: any, variables: Record<string, any>, path: string | null = null, secure: boolean = true): any {
    // only handle string values
    if (value == null || typeof value !== 'string') {
      return value;
    }

    // select the appropriate handler
    for (const handler of this.handlers) {
      if (handler.canHandle(value)) {
        return handler.process(value, path, variables, secure);
      }
    }

    // return the raw value if no handler was found
    return value;
  }

  /**
   * Recursively evaluates template expressions in objects and arrays
   */
  evaluateDeep<T = any>(obj: any, variables: Record<string, any>, path: string | null = null, secure: boolean = true): T {
    if (obj == null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      const arrayPath = path === null ? null : `${path}[]`;
      return obj.map(item => {
        return this.evaluateDeep(item, variables, arrayPath, secure);
      }) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const objectPath = path === null ? null : `${path}.${key}`;
        result[key] = this.evaluateDeep(value, variables, objectPath, secure);
      }
      return result as T;
    }

    return this.evaluate(obj, variables, path, secure) as T;
  }
}