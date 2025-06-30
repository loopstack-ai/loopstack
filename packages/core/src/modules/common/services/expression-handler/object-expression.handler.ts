import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { ExpressionEvaluatorService } from '../expression-evaluator.service';
import { SecureTemplateProcessor } from './secure-template-processor.service';

@Injectable()
export class ObjectExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(
    private expressionEvaluatorService: ExpressionEvaluatorService,
    private secureTemplateProcessor: SecureTemplateProcessor,
  ) {}

  canHandle(value: any): boolean {
    try {
      const trimmed = value.trim();
      return typeof value === 'string' && trimmed.startsWith('${{') && trimmed.endsWith('}}');
    } catch(e) {
      return false;
    }
  }

  process(value: string, path: string | null, variables: Record<string, any>, secure: boolean): any {
    const trimmed = value.trim();
    const expression = trimmed.replace(/^\$\{\{/, '{{');
    // const evalExpression = `{{stringify (${expression})}}`;
    // const result = this.expressionEvaluatorService.render(evalExpression, path, variables);

    return this.secureTemplateProcessor.parse(expression, path, variables, secure)

    // if (result === undefined || result === null || result === '') {
    //   return result;
    // }
    //
    // return JSON.parse(result);
  }
}