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

    // handle undefined values separately when serializing
    const stringify = (value: any) =>
      undefined === value ? 'undefined' : JSON.stringify(value);
    const processString = `<%- stringify(${content}) %>`;

    let result: string = ejs.render(processString, {
      ...variables,
      stringify,
    });

    return 'undefined' === result ? undefined : JSON.parse(result);
  }
}
