import Handlebars from 'handlebars';
import { z } from 'zod';
import { SchemaRegistry } from '../../configuration';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DateFormatterHandlebarsHelperService, JsonStringifyHandlebarsHelperService, ValueHandlebarsHelperService } from './handlebars-helpers';

@Injectable()
export class SecureHandlebarsProcessor implements OnModuleInit {
  private handlebars: typeof Handlebars;

  private allowedHelpers = {
    // Block helper: {{#if condition}}...{{/if}} - safe boolean evaluation
    'if': true,

    // Used with if/unless: {{#if}}...{{else}}...{{/if}} - safe alternative branch
    'else': true,

    // Block helper: {{#unless condition}}...{{/unless}} - safe negated conditional
    'unless': true,

    // Block helper: {{#each items}}{{this}}{{/each}} - safe iteration, no property traversal
    'each': true,

    // DISABLED: {{#with object}}{{property}}{{/with}} - can access dangerous object properties
    // Risk: {{#with constructor}}{{prototype}}{{/with}} could access prototype chain
    'with': false,

    // DISABLED: {{lookup object key}} - dynamic property access vulnerability
    // Risk: {{lookup this "constructor"}} or {{lookup (lookup this "constructor") "prototype"}}
    // Allows arbitrary object property traversal including prototype pollution
    'lookup': false,

    // CUSTOM HELPERS
    'currentDate': true,
    'formatDate': true,
    'timeAgo': true,
    'jsonStringify': true,
    'value': true,
  };

  private options = {
    // Currently disabled - throws on undefined properties like {{user.name}} when user is undefined
    // TODO: Enable with proper optional property handling (use {{#if user}}{{user.name}}{{/if}} pattern)
    strict: false,

    // XSS RISK: Currently disabled HTML escaping - ALL output is rendered as raw HTML
    // TODO: Set to false (enable escaping) and use {{{triple}}} for intentional raw HTML only
    noEscape: true,

    // Don't assume objects exist - prevents "Cannot read property of undefined" errors
    // Safely handles {{user.profile.name}} when user or profile might be undefined
    assumeObjects: false,

    // Prevent whitespace-based template obfuscation attacks
    // Disables indentation tricks that could hide malicious template code
    preventIndent: true,

    // Whitelist of allowed helpers - blocks dangerous helpers like 'lookup'
    // Only helpers explicitly listed in this.allowedHelpers can be used in templates
    knownHelpers: this.allowedHelpers,

    // Enforce helper whitelist - any unlisted helper throws compilation error
    // Prevents use of built-in dangerous helpers or injection of custom helpers
    knownHelpersOnly: true,

    // Disable @data variables (@root, @index, @key, etc.)
    // Prevents access to template context that could expose internal object structure
    data: false,

    // Require explicit context for partials
    // Forces {{> partial this}} instead of automatic context inheritance
    explicitPartialContext: true,

    // Use modern Handlebars behavior instead of legacy compatibility mode
    // Avoids potential vulnerabilities from older Handlebars versions
    compat: false,

    // Use default whitespace handling for standalone helpers
    // Prevents extra blank lines but minimal security impact
    ignoreStandalone: false,
  };

  private static readonly MAX_TEMPLATE_SIZE = 50000;

  constructor(
    private readonly schemaRegistry: SchemaRegistry,
    private readonly dateFormatterHandlebarsHelperService: DateFormatterHandlebarsHelperService,
    private readonly jsonStringifyHandlebarsHelperService: JsonStringifyHandlebarsHelperService,
    private readonly valueHandlebarsHelperService: ValueHandlebarsHelperService,
  ) {}

  onModuleInit() {
    this.handlebars = Handlebars.create();

    this.handlebars.registerHelper('currentDate', this.dateFormatterHandlebarsHelperService.getCurrentDateHelper());
    this.handlebars.registerHelper('formatDate', this.dateFormatterHandlebarsHelperService.getFormatDateHelper());
    this.handlebars.registerHelper('timeAgo', this.dateFormatterHandlebarsHelperService.getTimeAgoHelper());

    this.handlebars.registerHelper('jsonStringify', this.jsonStringifyHandlebarsHelperService.getJSONStringifyHelper());
    this.handlebars.registerHelper('value', this.valueHandlebarsHelperService.getValueHelper());
  }

  public render(content: string, variables: Record<string, any>): string {
    if (content.length > SecureHandlebarsProcessor.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template too large`);
    }

    // sanitize variables
    const sanitizedVariables = this.sanitizeVariables(variables);

    // compile template
    const template = this.handlebars.compile(content, this.options);

    // render
    return template(sanitizedVariables);
  }

  public parse(
    content: string,
    path: string,
    variables: Record<string, any>,
    secure: boolean,
  ): any {
    // Validate input format
    if (!content.startsWith('${{') || !content.endsWith('}}')) {
      throw new Error('parse content must start with ${{ and end with }}');
    }

    // Reconstruct as jsonStringify with value helper
    if (!path) {
      throw new Error('Need to specify a schema path for parsing expressions');
    }

    // if it is a parsable object but no schema is registered, then do not parse at all
    // and return original content, so it can potentially be parsed later
    const schema = this.schemaRegistry.getZodSchema(path);
    if (secure && !schema) {
      return content;
    }

    // Extract expression from handlebars tags
    const expression = content.slice(3, -2).trim();
    if (!expression) {
      throw new Error('Empty handlebars expression');
    }

    // render string types by default render
    if (schema instanceof z.ZodString) {
      return this.render(`{{${expression}}}`, variables);

      // parse boolean types
    } else if (schema instanceof z.ZodBoolean) {
      const result = this.render(`{{${expression}}}`, variables);
      return !!result;

      // parse object types or in unsecure context where target type is unknown
    } else if (!secure || schema instanceof z.ZodObject || schema instanceof z.ZodArray || schema instanceof z.ZodUnion || schema instanceof z.ZodAny) {
      // create a wrapper handlebars expression to safe-stringify the template expression
      // by validating and parsing based on schema (path)
      const wrappedExpression = `{{jsonStringify (value ${expression}) "${path}" "${secure ? '' : 'unsecure'}"}}`;

      // Render the wrapped template
      const result = this.render(wrappedExpression, variables);

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

    throw new Error(`Can't render unknown expression type in secure context: ${schema?.constructor.name}`);
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
