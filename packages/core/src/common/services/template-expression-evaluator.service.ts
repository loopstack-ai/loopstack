import { Injectable, Logger } from '@nestjs/common';
import { TemplateService } from './template.service';
import { BlockInterface } from '../interfaces';
import { SchemaValidationError } from '../errors';
import { z } from 'zod';
import { instanceToPlain } from 'class-transformer';
import { CustomHelper } from './handlebars-processor.service';
import { TemplateExOptions } from './expression-handler/template-expression.handler';

@Injectable()
export class TemplateExpressionEvaluatorService {
  private logger = new Logger(TemplateExpressionEvaluatorService.name);

  constructor(private templateService: TemplateService) {}

  private validateResult<T>(result: T, schema: z.ZodType): T {
    try {
      return schema.parse(result);
    } catch (error) {
      throw new SchemaValidationError(
        `Schema validation failed': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private isValidTemplate(value: any) {
    return (
      typeof value === 'string' ||
      (typeof value === 'object' &&
        value !== null &&
        Object.keys(value).length > 0)
    );
  }

  public evaluateTemplate<T>(
    obj: any,
    variables: any,
    options?: TemplateExOptions
  ): T {
    if (obj === undefined) {
      return obj;
    }

    // const selfProperties = instanceToPlain(variables, {
    //   strategy: 'exposeAll',
    //   groups,
    //   excludeExtraneousValues: true,
    // });

    // console.log('selfProperties', selfProperties);

    const result = this.evaluateTemplateRaw<T>(obj, variables, options);

    // this.logger.debug(`Evaluated ${obj} to ${result}`);
    // if (typeof result === 'object') {
    //   this.logger.debug(result);
    // }

    return options?.schema ? this.validateResult<T>(result, options.schema) : result;
  }

  public evaluateTemplateRaw<T>(obj: any, variables: any, options?: TemplateExOptions): T {
    const isValid = this.isValidTemplate(obj);
    return isValid ? this.templateService.evaluateDeep<T>(obj, variables, options) : obj;
  }
}
