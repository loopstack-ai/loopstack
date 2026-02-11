import { Injectable, Logger } from '@nestjs/common';
import { JexlExpressionError } from '../../errors/jexl-expression.error';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { TemplateExOptions } from './template-expression.handler';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import jexl = require('jexl');

type JexlInstance = InstanceType<typeof jexl.Jexl>;

@Injectable()
export class JexlExpressionHandler implements TemplateDetector, TemplateProcessor {
  private readonly logger = new Logger(JexlExpressionHandler.name);

  private readonly EXPRESSION_PATTERN = /^\$\{\{(.+)\}\}$/s;
  private readonly MAX_EXPRESSION_LENGTH = 2000;

  // Prevent access to dangerous prototype properties
  private readonly FORBIDDEN_PATTERNS = [/__proto__/, /constructor\s*\(/, /prototype\s*\./, /prototype\s*\[/];

  private readonly defaultInstance: JexlInstance = new jexl.Jexl();

  canHandle(value: unknown): boolean {
    return typeof value === 'string' && this.EXPRESSION_PATTERN.test(value.trim());
  }

  process(content: string, data: Record<string, unknown>, options?: TemplateExOptions): unknown {
    try {
      const expression = this.extractExpression(content);
      this.validateExpression(expression);

      const instance = this.createInstance(options);
      return this.evaluateExpression(instance, expression, data);
    } catch (error: unknown) {
      if (error instanceof JexlExpressionError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`JEXL expression processing failed: ${message}`);
      throw new JexlExpressionError('JEXL expression evaluation failed', 'EVALUATION_ERROR');
    }
  }

  private createInstance(options?: TemplateExOptions): JexlInstance {
    if (!options?.helpers?.length) {
      return this.defaultInstance;
    }

    const instance = new jexl.Jexl();
    for (const helper of options.helpers) {
      instance.addFunction(helper.name, helper.fn);
    }
    return instance;
  }

  private extractExpression(content: string): string {
    const match = content.trim().match(this.EXPRESSION_PATTERN);

    if (!match?.[1]?.trim()) {
      throw new JexlExpressionError('Invalid expression format', 'INVALID_FORMAT');
    }

    return match[1].trim();
  }

  private validateExpression(expression: string): void {
    if (expression.length > this.MAX_EXPRESSION_LENGTH) {
      throw new JexlExpressionError(
        `Expression too long (max: ${this.MAX_EXPRESSION_LENGTH} characters)`,
        'EXPRESSION_TOO_LONG',
      );
    }

    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(expression)) {
        throw new JexlExpressionError('Expression contains forbidden property access', 'FORBIDDEN_PROPERTY');
      }
    }
  }

  private evaluateExpression(instance: JexlInstance, expression: string, data: Record<string, unknown>): unknown {
    try {
      return instance.evalSync(expression, data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new JexlExpressionError(`Failed to evaluate expression: ${message}`, 'EVALUATION_FAILED');
    }
  }
}
