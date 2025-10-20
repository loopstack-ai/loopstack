import { Injectable, Logger } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { HandlebarsProcessor } from '../handlebars-processor.service';
import { TemplateExpressionError } from '../../errors/template-expression.error';

interface ProcessingContext {
  data: any;
  depth?: number;
}

@Injectable()
export class TemplateExpressionHandler
  implements TemplateDetector, TemplateProcessor
{
  private readonly logger = new Logger(TemplateExpressionHandler.name);

  private static readonly MAX_TEMPLATE_SIZE = 50000;

  constructor(
    private readonly handlebarsProcessor: HandlebarsProcessor,
  ) {}

  canHandle(value: any): boolean {
    return (
      typeof value === 'string' &&
      value.includes('{{') &&
      value.includes('}}') &&
      !value.trim().startsWith('${{')
    );
  }

  process(content: string, data: any): any {
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

      return this.handlebarsProcessor.render(content, context.data, {
        allowedProtoProperties: {
          // alternativeCalculation: true,
        },
      });
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
