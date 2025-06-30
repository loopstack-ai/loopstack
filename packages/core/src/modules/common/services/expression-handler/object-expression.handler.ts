import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { ExpressionEvaluatorService } from '../expression-evaluator.service';

@Injectable()
export class ObjectExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(
    private expressionEvaluatorService: ExpressionEvaluatorService,
  ) {}

  canHandle(value: any): boolean {
    try {
      const trimmed = value.trim();
      return typeof value === 'string' && trimmed.startsWith('${{') && trimmed.endsWith('}}');
    } catch(e) {
      return false;
    }
  }

  process(value: string, variables: Record<string, any>): any {
    const trimmed = value.trim();
    const expression = trimmed.replace(/^\$\{\{/, '').replace(/}}$/, '').trim();
    const evalExpression = `{{stringify (${expression})}}`;
    const result = this.expressionEvaluatorService.render(evalExpression, variables);

    if (result === undefined || result === null || result === '') {
      return result;
    }

    return JSON.parse(result);
  }
}