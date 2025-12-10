import { Injectable, Logger } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { CustomHelper, HandlebarsProcessor } from '../handlebars-processor.service';
import { TemplateExpressionError } from '../../errors/template-expression.error';
import { z } from 'zod';

interface ProcessingContext {
  data: any;
  depth?: number;
}

export interface TemplateExOptions {
  cacheKey?: string,
  schema?: z.ZodType,
  helpers?: CustomHelper[]
}


@Injectable()
export class TemplateExpressionHandler
  implements TemplateDetector, TemplateProcessor
{
  private readonly logger = new Logger(TemplateExpressionHandler.name);

  private static readonly MAX_TEMPLATE_SIZE = 50000;

  constructor(private readonly handlebarsProcessor: HandlebarsProcessor) {}

  canHandle(value: any): boolean {
    return (
      typeof value === 'string' &&
      value.includes('{{') &&
      value.includes('}}') &&
      !value.trim().startsWith('${{')
    );
  }

  process(content: string, data: any, options: TemplateExOptions): any {
    try {
      const context: ProcessingContext = {
        data,
        depth: 0,
      };

      if (content.length > TemplateExpressionHandler.MAX_TEMPLATE_SIZE) {
        throw new TemplateExpressionError(
          'Template too large',
          'EVALUATION_ERROR',
        );
      }

      return this.handlebarsProcessor.render(
        content,
        context.data,
        {
          cacheKeyPrefix: options.cacheKey,
          helpers: options.helpers,
        }
      );
    } catch (error) {
      this.logger.error(
        `Failed to process template expression: ${error.message}`,
        {
          expression: content,
        },
      );

      if (error instanceof TemplateExpressionError) {
        throw error;
      }

      throw new TemplateExpressionError(
        'Template expression evaluation failed',
        'EVALUATION_ERROR',
      );
    }
  }
}
