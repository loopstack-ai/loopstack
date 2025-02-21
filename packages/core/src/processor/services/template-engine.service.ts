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

  parseObjectValues(
    obj: Record<string, any>,
    variables: Record<string, any>,
  ): any {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        this.isTemplate(value) ? this.render(value, variables) : value,
      ]),
    );
  }
}
