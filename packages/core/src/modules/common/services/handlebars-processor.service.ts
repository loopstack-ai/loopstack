import Handlebars from 'handlebars';
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DateFormatterHelperService,
  OperatorsHelperService,
} from './handlebars-helpers';

@Injectable()
export class HandlebarsProcessor implements OnModuleInit {
  private handlebars: typeof Handlebars;

  private allowedHelpers = {
    // Block helper: {{#if condition}}...{{/if}} - safe boolean evaluation
    if: true,

    // Used with if/unless: {{#if}}...{{else}}...{{/if}} - safe alternative branch
    else: true,

    // Block helper: {{#unless condition}}...{{/unless}} - safe negated conditional
    unless: true,

    // Block helper: {{#each items}}{{this}}{{/each}} - safe iteration, no property traversal
    each: true,

    // Log helper
    log: true,

    // DISABLED: {{#with object}}{{property}}{{/with}} - can access dangerous object properties
    // Risk: {{#with constructor}}{{prototype}}{{/with}} could access prototype chain
    with: false,

    // DISABLED: {{lookup object key}} - dynamic property access vulnerability
    // Risk: {{lookup this "constructor"}} or {{lookup (lookup this "constructor") "prototype"}}
    // Allows arbitrary object property traversal including prototype pollution
    lookup: false,

    // CUSTOM HELPERS
    currentDate: true,
    formatDate: true,
    timeAgo: true,

    // EQUALITY OPERATORS - safe value comparison with sanitization
    eq: true, // {{#if (eq user.role "admin")}} - strict equality (===)
    ne: true, // {{#if (ne status "active")}} - strict inequality (!==)
    looseEq: true, // {{#if (looseEq value "5")}} - loose equality (==)
    looseNe: true, // {{#if (looseNe value "5")}} - loose inequality (!=)

    // COMPARISON OPERATORS - safe numeric comparison with type validation
    gt: true, // {{#if (gt user.age 18)}} - greater than
    gte: true, // {{#if (gte score 100)}} - greater than or equal
    lt: true, // {{#if (lt price 50)}} - less than
    lte: true, // {{#if (lte quantity 10)}} - less than or equal

    // LOGICAL OPERATORS - safe boolean logic with argument validation
    and: true, // {{#if (and user.isActive user.isVerified)}} - logical AND
    or: true, // {{#if (or user.isPremium user.isTrial)}} - logical OR
    not: true, // {{#if (not user.isBlocked)}} - logical NOT

    // STRING OPERATORS - safe string manipulation with sanitization
    contains: true, // {{#if (contains user.email "@company.com")}} - string contains
    startsWith: true, // {{#if (startsWith user.name "Dr.")}} - string starts with
    endsWith: true, // {{#if (endsWith file.name ".pdf")}} - string ends with
    regexTest: true, // {{#if (regexTest phone "^\\+1")}} - regex test with flag validation

    // ARRAY/OBJECT OPERATORS - safe collection operations without prototype access
    in: true, // {{#if (in user.role validRoles)}} - value in array/object
    length: true, // {{length items}} - get length of string/array/object
    isEmpty: true, // {{#if (isEmpty user.tags)}} - check if empty

    // TYPE CHECKING OPERATORS - safe runtime type validation
    typeOf: true, // {{typeOf value}} - get type as string
    isNull: true, // {{#if (isNull value)}} - check if null
    isUndefined: true, // {{#if (isUndefined value)}} - check if undefined
    isNumber: true, // {{#if (isNumber user.age)}} - check if number
    isString: true, // {{#if (isString user.name)}} - check if string
    isBoolean: true, // {{#if (isBoolean flag)}} - check if boolean
    isArray: true, // {{#if (isArray items)}} - check if array
    isObject: true, // {{#if (isObject user)}} - check if object (not array/null)

    // MATHEMATICAL OPERATORS - safe arithmetic with overflow/underflow protection
    add: true, // {{add price tax shipping}} - addition with multiple args
    subtract: true, // {{subtract original discount}} - subtraction
    multiply: true, // {{multiply price 0.08}} - multiplication
    divide: true, // {{divide total count}} - division with zero-division protection
    modulo: true, // {{modulo number 10}} - modulo with zero-division protection

    // UTILITY OPERATORS - safe fallback and default value handling
    default: true, // {{default user.displayName user.username}} - fallback value
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
    private readonly dateFormatterHelperService: DateFormatterHelperService,
    private readonly operatorsHelperService: OperatorsHelperService,
  ) {}

  onModuleInit() {
    this.handlebars = Handlebars.create();
    this.handlebars.registerHelper(
      'currentDate',
      this.dateFormatterHelperService.getCurrentDateHelper(),
    );
    this.handlebars.registerHelper(
      'formatDate',
      this.dateFormatterHelperService.getFormatDateHelper(),
    );
    this.handlebars.registerHelper(
      'timeAgo',
      this.dateFormatterHelperService.getTimeAgoHelper(),
    );

    // Equality operators
    this.handlebars.registerHelper(
      'eq',
      this.operatorsHelperService.getEqualsHelper(),
    );
    this.handlebars.registerHelper(
      'ne',
      this.operatorsHelperService.getNotEqualsHelper(),
    );
    this.handlebars.registerHelper(
      'looseEq',
      this.operatorsHelperService.getLooseEqualsHelper(),
    );
    this.handlebars.registerHelper(
      'looseNe',
      this.operatorsHelperService.getLooseNotEqualsHelper(),
    );

    // Comparison operators
    this.handlebars.registerHelper(
      'gt',
      this.operatorsHelperService.getGreaterThanHelper(),
    );
    this.handlebars.registerHelper(
      'gte',
      this.operatorsHelperService.getGreaterThanOrEqualHelper(),
    );
    this.handlebars.registerHelper(
      'lt',
      this.operatorsHelperService.getLessThanHelper(),
    );
    this.handlebars.registerHelper(
      'lte',
      this.operatorsHelperService.getLessThanOrEqualHelper(),
    );

    // Logical operators
    this.handlebars.registerHelper(
      'and',
      this.operatorsHelperService.getAndHelper(),
    );
    this.handlebars.registerHelper(
      'or',
      this.operatorsHelperService.getOrHelper(),
    );
    this.handlebars.registerHelper(
      'not',
      this.operatorsHelperService.getNotHelper(),
    );

    // String operators
    this.handlebars.registerHelper(
      'contains',
      this.operatorsHelperService.getContainsHelper(),
    );
    this.handlebars.registerHelper(
      'startsWith',
      this.operatorsHelperService.getStartsWithHelper(),
    );
    this.handlebars.registerHelper(
      'endsWith',
      this.operatorsHelperService.getEndsWithHelper(),
    );
    this.handlebars.registerHelper(
      'regexTest',
      this.operatorsHelperService.getRegexTestHelper(),
    );

    // Array/Object operators
    this.handlebars.registerHelper(
      'in',
      this.operatorsHelperService.getInHelper(),
    );
    this.handlebars.registerHelper(
      'length',
      this.operatorsHelperService.getLengthHelper(),
    );
    this.handlebars.registerHelper(
      'isEmpty',
      this.operatorsHelperService.getIsEmptyHelper(),
    );

    // Type checking operators
    this.handlebars.registerHelper(
      'typeOf',
      this.operatorsHelperService.getTypeOfHelper(),
    );
    this.handlebars.registerHelper(
      'isNull',
      this.operatorsHelperService.getIsNullHelper(),
    );
    this.handlebars.registerHelper(
      'isUndefined',
      this.operatorsHelperService.getIsUndefinedHelper(),
    );
    this.handlebars.registerHelper(
      'isNumber',
      this.operatorsHelperService.getIsNumberHelper(),
    );
    this.handlebars.registerHelper(
      'isString',
      this.operatorsHelperService.getIsStringHelper(),
    );
    this.handlebars.registerHelper(
      'isBoolean',
      this.operatorsHelperService.getIsBooleanHelper(),
    );
    this.handlebars.registerHelper(
      'isArray',
      this.operatorsHelperService.getIsArrayHelper(),
    );
    this.handlebars.registerHelper(
      'isObject',
      this.operatorsHelperService.getIsObjectHelper(),
    );

    // Mathematical operators
    this.handlebars.registerHelper(
      'add',
      this.operatorsHelperService.getAddHelper(),
    );
    this.handlebars.registerHelper(
      'subtract',
      this.operatorsHelperService.getSubtractHelper(),
    );
    this.handlebars.registerHelper(
      'multiply',
      this.operatorsHelperService.getMultiplyHelper(),
    );
    this.handlebars.registerHelper(
      'divide',
      this.operatorsHelperService.getDivideHelper(),
    );
    this.handlebars.registerHelper(
      'modulo',
      this.operatorsHelperService.getModuloHelper(),
    );

    // Utility operators
    this.handlebars.registerHelper(
      'default',
      this.operatorsHelperService.getDefaultHelper(),
    );
  }

  public render(content: string, data: any, options: RuntimeOptions = {}): string {
    if (content.length > HandlebarsProcessor.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template too large`);
    }

    const template = this.handlebars.compile(content, this.options);
    return template(data, options);
  }
}
