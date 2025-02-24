import { Injectable } from '@nestjs/common';
const ejs = require('ejs');

@Injectable()
export class TemplateEngineService {
  isTemplate(value: any): boolean {
    return typeof value === 'string' && value.indexOf('<%') !== -1;
  }

  render(template: string, variables: Record<string, any>): string {
    return ejs.render(template, variables);
  }

  parseValue(value: string, variables: Record<string, any>) {
    return this.isTemplate(value) ? this.render(value, variables) : value;
  }
}
