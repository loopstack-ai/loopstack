import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
const ejs = require('ejs');

@Injectable()
export class EjsTemplateHandler implements TemplateDetector, TemplateProcessor {

  canHandle(value: any): boolean {
    return typeof value === 'string' && value.includes('<%');
  }

  process(value: string, variables: Record<string, any>): string {
    return ejs.render(value, variables);
  }
}