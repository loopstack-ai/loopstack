import Handlebars from 'handlebars';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DateFormatterHandlebarsHelperService } from './handlebars-helpers';

@Injectable()
export class HandlebarsProcessor implements OnModuleInit {
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
    private readonly dateFormatterHandlebarsHelperService: DateFormatterHandlebarsHelperService,
  ) {}

  onModuleInit() {
    this.handlebars = Handlebars.create();
    this.handlebars.registerHelper('currentDate', this.dateFormatterHandlebarsHelperService.getCurrentDateHelper());
    this.handlebars.registerHelper('formatDate', this.dateFormatterHandlebarsHelperService.getFormatDateHelper());
    this.handlebars.registerHelper('timeAgo', this.dateFormatterHandlebarsHelperService.getTimeAgoHelper());
  }

  public render(content: string, variables: Record<string, any>): string {
    if (content.length > HandlebarsProcessor.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template too large`);
    }

    const template = this.handlebars.compile(content, this.options);
    return template(variables);
  }
}
