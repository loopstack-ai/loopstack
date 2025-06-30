import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { ExpressionEvaluatorService } from '../expression-evaluator.service';

@Injectable()
export class TemplateExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(
    private expressionEvaluatorService: ExpressionEvaluatorService,
  ) {}

  canHandle(value: any): boolean {
    try {
      return typeof value === 'string' && value.includes('{{') && value.includes('}}') && !value.trim().startsWith('${{');
    } catch(e) {
      return false;
    }
  }

  process(value: string, variables: Record<string, any>): string {
    return this.expressionEvaluatorService.render(value, variables);
  }
}