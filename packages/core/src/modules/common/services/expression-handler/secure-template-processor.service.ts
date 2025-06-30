import Handlebars from 'handlebars';
import { z } from 'zod';
import { SchemaRegistry } from '../../../configuration';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SecureTemplateProcessor {
  private handlebars: typeof Handlebars;

  private static readonly MAX_JSON_SIZE = 10000;
  private static readonly MAX_TEMPLATE_SIZE = 50000;

  constructor(private schemaRegistry: SchemaRegistry) {
    this.initializeSecureHandlebars();
  }

  /**
   * Initialize Handlebars with maximum security
   */
  private initializeSecureHandlebars(): void {
    this.handlebars = Handlebars.create();
    // this.handlebars.helpers = {}; // Remove all built-in helpers
    this.registerSafeHelpers();
  }

  /**
   * Register only safe helpers
   */
  private registerSafeHelpers(): void {
    this.handlebars.registerHelper('uppercase', (str: unknown) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: unknown) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('ifEqual', function(a: unknown, b: unknown, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    this.handlebars.registerHelper('jsonStringify', (value: unknown, path: unknown, unsecureFlag: unknown) => {
      return this.jsonStringify(value, path, unsecureFlag === 'unsecure');
    });

    // Helper that just returns the value - used internally by renderStringified
    this.handlebars.registerHelper('value', (expression: unknown) => {
      return expression;
    });
  }

  /**
   * Main render method
   */
  public render(content: string, variables: Record<string, any>): string {
    if (content.length > SecureTemplateProcessor.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template too large`);
    }

    // const sanitizedVariables = this.sanitizeVariables(variables);

    const template = this.handlebars.compile(content, {
      strict: false, // true: breaks when trying to access optional properties
      noEscape: true,
      // knownHelpers: this.getKnownHelpers(),
      // knownHelpersOnly: true,
      // data: false,
      // blockParams: false
    });

    return template(variables);
  }

  /**
   * Parse handlebars expressions with automatic schema validation and type conversion
   *
   * @param content - Handlebars expression like "{{ user.name }}" or "{{ . }}"
   * @param variables - Template variables
   * @param path
   * @param secure
   * @returns Parsed value (object, string, number, boolean, null) or undefined
   */
  public parse(
    content: string,
    path: string | null,
    variables: Record<string, any>,
    secure: boolean,
  ): any {
    // Validate input format
    if (!content.startsWith('{{') || !content.endsWith('}}')) {
      throw new Error('parse content must start with {{ and end with }}');
    }

    // Extract expression from handlebars tags
    const expression = content.slice(2, -2).trim();
    if (!expression) {
      throw new Error('Empty handlebars expression');
    }

    // Reconstruct as jsonStringify with value helper
    if (null !== path) {

      // if it is a parsable object but no schema is registered, then do not parse at all
      // and return original expression string, so it can potentially be parsed later
      const hasSchema = this.schemaRegistry.hasSchema(path);
      if (secure && !hasSchema) {
        return `$${content}`; // re-add the leading to mark object expressions
      }

      const reconstructedTemplate = `{{jsonStringify (value ${expression}) "${path}" "${secure ? '' : 'unsecure'}"}}`;

      // Render the template
      const result = this.render(reconstructedTemplate, variables);

      // Handle undefined case
      if (result === 'undefined') {
        return undefined;
      }

      // Parse JSON result
      try {
        return JSON.parse(result);
      } catch (error) {
        throw new Error(`Failed to parse JSON result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.render(content, variables);
  }

  /**
   * Secure JSON stringify with schema validation
   */
  private jsonStringify(value: unknown, path: unknown, isUnsecure: boolean): string {
    // Validate parameters
    if (typeof path !== 'string') {
      throw new Error(`jsonStringify path must be a string, got: ${typeof path}`);
    }

    // if (!this.schemaRegistry.hasSchema(path)) {
    //   throw new Error(`Schema path '${path}' not found`);
    // }

    // Special case: if value is undefined, return undefined (not stringified)
    if (value === undefined) {
      return 'undefined';
    }

    const zodSchema = this.schemaRegistry.getZodSchema(path)!;

    try {
      if (isUnsecure) {
        return JSON.stringify(value);
      }

      const safeValue = zodSchema.parse(value);
      const jsonString = JSON.stringify(safeValue);

      if (jsonString.length > SecureTemplateProcessor.MAX_JSON_SIZE) {
        throw new Error(`JSON output too large: ${jsonString.length} > ${SecureTemplateProcessor.MAX_JSON_SIZE} characters`);
      }

      return jsonString;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed for '${path}': ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error; // Re-throw other errors (including size limit error)
    }
  }

  /**
   * Get known helpers whitelist
   */
  private getKnownHelpers(): Record<string, boolean> {
    const helpers: Record<string, boolean> = {};
    for (const name of Object.keys(this.handlebars.helpers)) {
      helpers[name] = true;
    }
    return helpers;
  }

  /**
   * Sanitize variables for template use
   */
  private sanitizeVariables(variables: Record<string, any>): Record<string, any> {
    return this.deepSanitize(variables, 0) as Record<string, any>;
  }

  /**
   * Deep sanitization of values with recursion protection
   */
  private deepSanitize(value: any, depth = 0): any {
    // Prevent infinite recursion and stack overflow (DoS protection)
    if (depth > 50) {
      return undefined;
    }

    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.deepSanitize(item, depth + 1));
    }

    if (type === 'object' && value.constructor === Object) {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedValue = this.deepSanitize(val, depth + 1);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
      return sanitized;
    }

    return undefined;
  }
}
