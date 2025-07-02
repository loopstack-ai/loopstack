import { Injectable, Logger } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { get } from 'lodash';
import { SchemaRegistry } from '../../../configuration';
import { VariableSanitizerService } from '../variable-sanitizer.service';
import { ObjectExpressionError } from '../../errors/object-expression.error';

interface ValidationOptions {
  maxDepth?: number;
  maxLength?: number;
  allowedPatterns?: RegExp[];
}

interface ProcessingContext {
  variables: Record<string, any>;
  depth?: number;
}

@Injectable()
export class ObjectExpressionHandler
  implements TemplateDetector, TemplateProcessor
{
  private readonly logger = new Logger(ObjectExpressionHandler.name);

  private readonly DEFAULT_MAX_DEPTH = 10;
  private readonly DEFAULT_MAX_LENGTH = 1000;

  private readonly EXPRESSION_PATTERN = /^\$\{\{(.+)\}\}$/;

  private readonly DANGEROUS_PATTERNS = [
    /^__/, // Properties starting with double underscore
    /\b__proto__\b/i, // Exact __proto__ match
    /\bprototype\b$/i, // Exact prototype at end of segment
    /\bconstructor\b$/i, // Exact constructor at end of segment
    /\beval\b$/i, // Exact eval at end of segment
    /\bfunction\b$/i, // Exact function at end of segment
    /\brequire\b$/i, // Exact require at end of segment
    /\bimport\b$/i, // Exact import at end of segment
    /\bprocess\b$/i, // Exact process at end of segment
    /\bprocess\.env\b/i, // Exact process.env anywhere
    /\bglobal\b$/i, // Exact global at end of segment
    /\bwindow\b$/i, // Exact window at end of segment
    /\bBuffer\b$/i, // Exact Buffer at end of segment
    /\bconsole\b$/i, // Exact console at end of segment
  ];

  private readonly VALID_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+(\[\d+\])?$/;

  constructor(
    private readonly schemaRegistry: SchemaRegistry,
    private readonly variableSanitizerService: VariableSanitizerService,
  ) {}

  canHandle(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmed = value.trim();
    return this.EXPRESSION_PATTERN.test(trimmed);
  }

  process(content: string, variables: Record<string, any>): any {
    try {
      const context: ProcessingContext = {
        variables,
        depth: 0,
      };

      return this.processExpression(content, context);
    } catch (error) {
      this.logger.error(
        `Failed to process object expression (${content}): ${error.message}`,
        {
          expression: content,
        },
      );

      if (error instanceof ObjectExpressionError) {
        throw error;
      }

      throw new ObjectExpressionError(
        'Object expression evaluation failed',
        'EVALUATION_ERROR',
      );
    }
  }

  private processExpression(content: string, context: ProcessingContext): any {
    const expression = this.extractExpression(content);

    this.validateExpression(expression);

    const sanitizedVariables = this.variableSanitizerService.sanitizeVariables(
      context.variables,
    );
    return this.evaluateExpression(expression, sanitizedVariables);
  }

  private extractExpression(content: string): string {
    const trimmed = content.trim();
    const match = trimmed.match(this.EXPRESSION_PATTERN);

    if (!match || !match[1]) {
      throw new ObjectExpressionError(
        'Invalid expression format',
        'INVALID_FORMAT',
      );
    }

    const expression = match[1].trim();
    if (!expression) {
      throw new ObjectExpressionError(
        'Empty expression not allowed',
        'EMPTY_EXPRESSION',
      );
    }

    return expression;
  }

  private validateExpression(
    expression: string,
    options: ValidationOptions = {},
  ): void {
    const {
      maxDepth = this.DEFAULT_MAX_DEPTH,
      maxLength = this.DEFAULT_MAX_LENGTH,
    } = options;

    if (expression.length > maxLength) {
      throw new ObjectExpressionError(
        `Expression too long (max: ${maxLength} characters)`,
        'EXPRESSION_TOO_LONG',
      );
    }

    const segments = this.parseExpressionSegments(expression);
    if (segments.length > maxDepth) {
      throw new ObjectExpressionError(
        `Expression depth too high (max: ${maxDepth} levels)`,
        'DEPTH_EXCEEDED',
      );
    }

    this.validateSegmentsSecurity(segments);
  }

  private parseExpressionSegments(expression: string): string[] {
    return expression.split('.').filter((segment) => segment.length > 0);
  }

  private validateSegmentsSecurity(segments: string[]): void {
    for (const segment of segments) {
      // Check against dangerous patterns
      if (this.DANGEROUS_PATTERNS.some((pattern) => pattern.test(segment))) {
        throw new ObjectExpressionError(
          'Expression contains prohibited patterns',
          'SECURITY_VIOLATION',
        );
      }

      // Validate segment format
      if (!this.VALID_SEGMENT_PATTERN.test(segment)) {
        throw new ObjectExpressionError(
          'Expression contains invalid characters or format',
          'INVALID_SEGMENT',
        );
      }
    }
  }

  private evaluateExpression(
    expression: string,
    variables: Record<string, any>,
  ): any {
    try {
      return get(variables, expression);
    } catch (error) {
      throw new ObjectExpressionError(
        'Failed to evaluate expression path',
        'EVALUATION_FAILED',
      );
    }
  }
}
