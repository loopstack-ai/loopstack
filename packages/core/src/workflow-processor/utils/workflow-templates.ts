import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { TemplateRenderFn } from '@loopstack/common';

/**
 * Compiles and caches Handlebars templates from file paths.
 *
 * Provides a `render` function that can be wired onto workflows and tools
 * via NestJS DI (TEMPLATE_RENDERER token).
 */
export class TemplateRenderer {
  private readonly compiled = new Map<string, HandlebarsTemplateDelegate>();

  /** The render function to inject onto workflows/tools */
  readonly render: TemplateRenderFn = (path: string, data?: Record<string, unknown>): string => {
    let compiled = this.compiled.get(path);
    if (!compiled) {
      const source = fs.readFileSync(path, 'utf-8');
      compiled = Handlebars.compile(source);
      this.compiled.set(path, compiled);
    }
    return compiled(data ?? {});
  };
}
