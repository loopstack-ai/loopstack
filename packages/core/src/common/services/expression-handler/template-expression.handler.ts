import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { TemplateExpressionError } from '../../errors/template-expression.error';
import { CustomHelper, HandlebarsProcessor } from '../handlebars-processor.service';
import { TemplateDetector, TemplateProcessor } from '../template.service';

interface ProcessingContext {
  data: Record<string, unknown>;
  depth?: number;
}

export interface TemplateExOptions {
  cacheKey?: string;
  schema?: z.ZodType;
  helpers?: CustomHelper[];
}

@Injectable()
export class TemplateExpressionHandler implements TemplateDetector, TemplateProcessor {
  private readonly logger = new Logger(TemplateExpressionHandler.name);

  private static readonly MAX_TEMPLATE_SIZE = 50000;

  constructor(private readonly handlebarsProcessor: HandlebarsProcessor) {}

  canHandle(value: unknown): boolean {
    return typeof value === 'string' && value.includes('{{') && value.includes('}}') && !value.trim().startsWith('${{');
  }

  process(content: string, data: Record<string, unknown>, options: TemplateExOptions): unknown {
    try {
      const context: ProcessingContext = {
        data,
        depth: 0,
      };

      if (content.length > TemplateExpressionHandler.MAX_TEMPLATE_SIZE) {
        throw new TemplateExpressionError('Template too large', 'EVALUATION_ERROR');
      }

      return this.handlebarsProcessor.render(content, context.data, {
        cacheKeyPrefix: options.cacheKey,
        helpers: options.helpers,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process template expression: ${message}`, {
        expression: content,
      });

      if (error instanceof TemplateExpressionError) {
        throw error;
      }

      throw new TemplateExpressionError('Template expression evaluation failed', 'EVALUATION_ERROR');
    }
  }
}
