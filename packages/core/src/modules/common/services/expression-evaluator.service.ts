import { Injectable } from '@nestjs/common';
import ejs from 'ejs';

@Injectable()
export class ExpressionEvaluatorService {
  isExpression(input: any): boolean {
    if (typeof input !== 'string') {
      return false;
    }
    const trimmed = input.trim();
    return trimmed.startsWith('${') && trimmed.endsWith('}');
  }

  extractGetContents(input: string): string {
    return input.trim().replace(/^\${/, '').replace(/}$/, '').trim();
  }

  evaluate(value: any, variables: Record<string, any>): any {
    if (!this.isExpression(value)) {
      return value;
    }

    const content = this.extractGetContents(value);

    // if there double ${{ }} is uses, convert the result
    const isObjectOutput = content.startsWith('{') && content.endsWith('}');
    const innerContent = content.replace(/^{/, '').replace(/}$/, '').trim();

    const processString = isObjectOutput
      ? `<%- JSON.stringify(${innerContent}) %>`
      : `<%- ${innerContent} %>`;
    let result: string = ejs.render(processString, variables);

    return isObjectOutput ? JSON.parse(result) : result;
  }
}
