import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { StringParser } from '../string-parser.service';
const ejs = require('ejs');

@Injectable()
export class ObjectExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(private stringParser: StringParser) {}

  canHandle(value: any): boolean {
    return typeof value === 'string' && this.stringParser.isCompleteExpression(value);
  }

  process(value: string, variables: Record<string, any>): any {
    const content = this.stringParser.extractExpressionContent(value);

    // Create a safe evaluation context
    const safeStringify = (val: any): string => {
      return val === undefined ? 'undefined' : JSON.stringify(val);
    };

    const ejsTemplate = `<%- safeStringify(${content}) %>`;

    const result = ejs.render(ejsTemplate, {
      ...variables,
      safeStringify,
    });

    return result === 'undefined' ? undefined : JSON.parse(result);
  }
}