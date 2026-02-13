import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { SchemaValidationError } from '../errors';
import { TemplateExOptions } from './expression-handler/template-expression.handler';
import { TemplateService } from './template.service';

@Injectable()
export class TemplateExpressionEvaluatorService {
  private logger = new Logger(TemplateExpressionEvaluatorService.name);

  constructor(private templateService: TemplateService) {}

  private validateResult<T>(result: unknown, schema: z.ZodType<T>): T {
    try {
      return schema.parse(result);
    } catch (error) {
      throw new SchemaValidationError(
        `Schema validation failed': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private isValidTemplate(value: unknown): boolean {
    return typeof value === 'string' || (typeof value === 'object' && value !== null && Object.keys(value).length > 0);
  }

  public evaluateTemplate<T>(obj: unknown, variables: Record<string, unknown>, options?: TemplateExOptions): T {
    if (obj === undefined) {
      return obj as T;
    }

    const result = this.evaluateTemplateRaw<T>(obj, variables, options);
    return options?.schema ? this.validateResult(result, options.schema as z.ZodType<T>) : result;
  }

  public evaluateTemplateRaw<T>(obj: unknown, variables: Record<string, unknown>, options?: TemplateExOptions): T {
    const isValid = this.isValidTemplate(obj);
    return isValid ? this.templateService.evaluateDeep<T>(obj, variables, options) : (obj as T);
  }
}
