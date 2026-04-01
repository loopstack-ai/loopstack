import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { WorkflowTemplates } from '@loopstack/common';

/**
 * Implementation of WorkflowTemplates that reads .md files
 * and renders them using Handlebars.
 */
export class WorkflowTemplatesImpl implements WorkflowTemplates {
  private readonly compiled = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private readonly templatePaths: Record<string, string>) {}

  render(name: string, data?: Record<string, unknown>): string {
    let compiled = this.compiled.get(name);
    if (!compiled) {
      const path = this.templatePaths[name];
      if (!path) {
        throw new Error(
          `Template "${name}" not found. Available templates: [${Object.keys(this.templatePaths).join(', ')}]`,
        );
      }
      const source = fs.readFileSync(path, 'utf-8');
      compiled = Handlebars.compile(source);
      this.compiled.set(name, compiled);
    }
    return compiled(data ?? {});
  }

  has(name: string): boolean {
    return name in this.templatePaths;
  }

  names(): string[] {
    return Object.keys(this.templatePaths);
  }
}
