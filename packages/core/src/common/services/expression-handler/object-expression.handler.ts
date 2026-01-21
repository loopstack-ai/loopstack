import { Injectable, Logger } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { get } from 'lodash';
import { ObjectExpressionError } from '../../errors/object-expression.error';

@Injectable()
export class ObjectExpressionHandler
  implements TemplateDetector, TemplateProcessor
{
  private readonly logger = new Logger(ObjectExpressionHandler.name);

  private readonly EXPRESSION_PATTERN = /^\$\{(.+)\}$/;
  private readonly MAX_EXPRESSION_LENGTH = 1000;
  private readonly MAX_DEPTH = 10;

  // Prevent access to dangerous prototype properties
  private readonly FORBIDDEN_PROPERTIES = new Set([
    '__proto__',
    'constructor',
    'prototype',
  ]);

  canHandle(value: any): boolean {
    return (
      typeof value === 'string' && this.EXPRESSION_PATTERN.test(value.trim())
    );
  }

  process(content: string, data: any): any {
    try {
      const expression = this.extractExpression(content);
      this.validateExpression(expression);
      return this.evaluateExpression(expression, data);
    } catch (error) {
      if (error instanceof ObjectExpressionError) {
        throw error;
      }

      this.logger.error(`Expression processing failed: ${error.message}`);
      throw new ObjectExpressionError(
        'Object expression evaluation failed',
        'EVALUATION_ERROR',
      );
    }
  }

  private extractExpression(content: string): string {
    const match = content.trim().match(this.EXPRESSION_PATTERN);

    if (!match?.[1]?.trim()) {
      throw new ObjectExpressionError(
        'Invalid expression format',
        'INVALID_FORMAT',
      );
    }

    return match[1].trim();
  }

  private validateExpression(expression: string): void {
    if (expression.length > this.MAX_EXPRESSION_LENGTH) {
      throw new ObjectExpressionError(
        `Expression too long (max: ${this.MAX_EXPRESSION_LENGTH} characters)`,
        'EXPRESSION_TOO_LONG',
      );
    }

    const segments = expression.split('.').filter((s) => s.length > 0);

    if (segments.length > this.MAX_DEPTH) {
      throw new ObjectExpressionError(
        `Expression depth too high (max: ${this.MAX_DEPTH} levels)`,
        'DEPTH_EXCEEDED',
      );
    }

    // Check for prototype pollution attempts
    for (const segment of segments) {
      const cleanSegment = segment.replace(/\[\d+\]$/, ''); // Remove array indices

      if (this.FORBIDDEN_PROPERTIES.has(cleanSegment)) {
        throw new ObjectExpressionError(
          'Expression contains forbidden property access',
          'FORBIDDEN_PROPERTY',
        );
      }
    }
  }

  private evaluateExpression(expression: string, data: any): any {
    try {
      const value = get(data, expression);

      // If the value is a getter function, invoke it
      if (typeof value === 'function') {
        return (value as Function).call(undefined);
      }

      return value;
    } catch (error) {
      throw new ObjectExpressionError(
        'Failed to evaluate expression',
        'EVALUATION_FAILED',
      );
    }
  }
}
