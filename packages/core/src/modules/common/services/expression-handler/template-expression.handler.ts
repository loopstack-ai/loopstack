import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { StringParser } from '../string-parser.service';
const ejs = require('ejs');

@Injectable()
export class TemplateExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(private stringParser: StringParser) {}

  canHandle(value: any): boolean {
    if (typeof value !== 'string' || !value.includes('${')) {
      return false;
    }

    try {
      return !this.stringParser.isCompleteExpression(value);
    } catch(e) {
      return false;
    }
  }

  process(value: string, variables: Record<string, any>): string {
    const ejsTemplate = this.convertToEjsTemplate(value);
    return ejs.render(ejsTemplate, variables);
  }

  private convertToEjsTemplate(value: string): string {
    let result = '';
    let i = 0;

    while (i < value.length) {
      if (value[i] === '$' && i + 1 < value.length && value[i + 1] === '{') {
        // Found start of expression
        const expressionStart = i;
        const closingIndex = this.stringParser.findMatchingBrace(value, i + 2);

        const expression = value.slice(expressionStart + 2, closingIndex);

        if (expression === '') {
          result += '';
        } else {
          result += `<%-${expression}%>`;
        }

        i = closingIndex + 1;
      } else {
        result += value[i];
        i++;
      }
    }

    return result;
  }
}