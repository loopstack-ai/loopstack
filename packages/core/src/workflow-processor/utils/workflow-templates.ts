import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import { TemplateRenderFn } from '@loopstack/common';

/**
 * The Handlebars environment templates are compiled in — the framework's own, so the helpers registered here
 * never leak into an application's unrelated Handlebars use, and vice versa.
 */
const handlebars = Handlebars.create();

/**
 * `eq` — strict equality, for branching on a value inside a template:
 *
 * ```handlebars
 * {{#if (eq outcome "approved")}}Approved.{{/if}}
 * ```
 *
 * Handlebars ships no comparison helpers, so without this a template can only test truthiness, and a workflow
 * has to turn every enum into a set of booleans before rendering.
 */
handlebars.registerHelper('eq', (a: unknown, b: unknown): boolean => a === b);

/**
 * Compiles and caches Handlebars templates from file paths.
 *
 * Can be injected directly as a class or via TEMPLATE_RENDERER token (function).
 */
@Injectable()
export class TemplateRenderer {
  private readonly compiled = new Map<string, HandlebarsTemplateDelegate>();

  /** The render function to inject onto workflows/tools */
  readonly render: TemplateRenderFn = (path: string, data?: Record<string, unknown>): string => {
    let compiled = this.compiled.get(path);
    if (!compiled) {
      const source = fs.readFileSync(path, 'utf-8');
      compiled = handlebars.compile(source);
      this.compiled.set(path, compiled);
    }
    return compiled(data ?? {});
  };
}
