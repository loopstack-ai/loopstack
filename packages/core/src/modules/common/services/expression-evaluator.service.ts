import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as _ from 'lodash';

@Injectable()
export class ExpressionEvaluatorService {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create(); // Create isolated instance
    this.registerHelpers();
  }

  render(content: string, variables: Record<string, any>): any {
    try {
      const template = this.handlebars.compile(content, {
        strict: true,
        noEscape: true,
      });

      return template(variables);
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private registerHelpers(): void {
    // ==================== LODASH OBJECT HELPERS ====================

    // Get helper - supports deep paths with default values
    this.handlebars.registerHelper('get', (object: any, path: string, defaultValue?: any) => {
      return _.get(object, path, defaultValue);
    });

    // Has helper - check if path exists
    this.handlebars.registerHelper('has', (object: any, path: string) =>
      _.has(object, path)
    );

    // Set helper - create new object with value set at path
    this.handlebars.registerHelper('set', (object: any, path: string, value: any) => {
      const result = _.cloneDeep(object);
      _.set(result, path, value);
      return result;
    });

    // Pick helper - create object with only specified properties
    this.handlebars.registerHelper('pick', (object: any, ...paths) => {
      paths.pop(); // Remove Handlebars options
      return _.pick(object, paths);
    });

    // Omit helper - create object without specified properties
    this.handlebars.registerHelper('omit', (object: any, ...paths) => {
      paths.pop(); // Remove Handlebars options
      return _.omit(object, paths);
    });

    // Keys, values, entries
    this.handlebars.registerHelper('keys', (obj: object) => _.keys(obj));
    this.handlebars.registerHelper('values', (obj: object) => _.values(obj));
    this.handlebars.registerHelper('entries', (obj: object) => _.toPairs(obj));

    // Merge objects
    this.handlebars.registerHelper('merge', (...objects: any[]) => {
      const options = objects.pop(); // Remove Handlebars options
      return _.merge({}, ...objects);
    });

    // Assign objects (shallow merge)
    this.handlebars.registerHelper('assign', (...objects: any[]) => {
      const options = objects.pop(); // Remove Handlebars options
      return _.assign({}, ...objects);
    });

    // Deep clone
    this.handlebars.registerHelper('clone', (value: any) => _.cloneDeep(value));

    // ==================== LODASH ARRAY HELPERS ====================

    // Array access and manipulation
    this.handlebars.registerHelper('at', (array: any[], ...indices) => {
      indices.pop(); // Remove Handlebars options
      return _.at(array, indices);
    });

    this.handlebars.registerHelper('first', (array: any[]) => {
      return _.head(array);
    });

    this.handlebars.registerHelper('last', (array: any[]) => {
      return _.last(array);
    });

    this.handlebars.registerHelper('nth', (array: any[], index: number) =>
      _.nth(array, index)
    );

    // Array methods
    this.handlebars.registerHelper('slice', (array: any[], start: number, end: number) =>
      _.slice(array, start, end)
    );

    this.handlebars.registerHelper('take', (array: any[], count: number) =>
      _.take(array, count)
    );

    this.handlebars.registerHelper('drop', (array: any[], count: number) =>
      _.drop(array, count)
    );

    this.handlebars.registerHelper('reverse', (array: any[]) =>
      _.reverse([...array]) // Don't mutate original
    );

    this.handlebars.registerHelper('shuffle', (array: any[]) =>
      _.shuffle(array)
    );

    this.handlebars.registerHelper('uniq', (array: any[]) =>
      _.uniq(array)
    );

    this.handlebars.registerHelper('uniqBy', (array: any[], property: string) =>
      _.uniqBy(array, property)
    );

    this.handlebars.registerHelper('compact', (array: any[]) =>
      _.compact(array)
    );

    this.handlebars.registerHelper('flatten', (array: any[]) =>
      _.flatten(array)
    );

    this.handlebars.registerHelper('flattenDeep', (array: any[]) =>
      _.flattenDeep(array)
    );

    this.handlebars.registerHelper('filter', (array: any[], value: any) => {
      return _.filter(array, value);
    });

    this.handlebars.registerHelper('filterBy', (array: any[], property: string, value: any) => {
      return _.filter(array, { [property]: value });
    });

    this.handlebars.registerHelper('find', (array: any[], value: any) => {
      return _.find(array, value);
    });

    this.handlebars.registerHelper('findBy', (array: any[], property: string, value: any) => {
      return _.find(array, { [property]: value });
    });

    this.handlebars.registerHelper('some', (array: any[], property: string, value?: any) => {
      if (value !== undefined) {
        return _.some(array, { [property]: value });
      }
      return _.some(array, property);
    });

    this.handlebars.registerHelper('every', (array: any[], property: string, value?: any) => {
      if (value !== undefined) {
        return _.every(array, { [property]: value });
      }
      return _.every(array, property);
    });

    // Array transformation
    this.handlebars.registerHelper('map', (array: any[], property: string) =>
      _.map(array, property)
    );

    this.handlebars.registerHelper('pluck', (array: any[], property: string) =>
      _.map(array, property) // pluck is deprecated, use map
    );

    this.handlebars.registerHelper('groupBy', (array: any[], property: string) =>
      _.groupBy(array, property)
    );

    this.handlebars.registerHelper('keyBy', (array: any[], property: string) =>
      _.keyBy(array, property)
    );

    this.handlebars.registerHelper('orderBy', (array: any[], properties: string | string[], orders?: boolean | "asc" | "desc" | (boolean | "asc" | "desc")[]) =>
      _.orderBy(array, properties, orders)
    );

    this.handlebars.registerHelper('sortBy', (array: any[], property: string) =>
      _.sortBy(array, property)
    );

    // Array aggregation
    this.handlebars.registerHelper('sum', (array: any[]) =>
      _.sum(array)
    );

    this.handlebars.registerHelper('sumBy', (array: any[], property: string) =>
      _.sumBy(array, property)
    );

    this.handlebars.registerHelper('mean', (array: any[]) =>
      _.mean(array)
    );

    this.handlebars.registerHelper('meanBy', (array: any[], property: string) =>
      _.meanBy(array, property)
    );

    this.handlebars.registerHelper('min', (array: any[]) =>
      _.min(array)
    );

    this.handlebars.registerHelper('minBy', (array: any[], property: string) =>
      _.minBy(array, property)
    );

    this.handlebars.registerHelper('max', (array: any[]) =>
      _.max(array)
    );

    this.handlebars.registerHelper('maxBy', (array: any[], property: string) =>
      _.maxBy(array, property)
    );

    // ==================== LODASH STRING HELPERS ====================

    this.handlebars.registerHelper('camelCase', (str: string) => _.camelCase(str));
    this.handlebars.registerHelper('kebabCase', (str: string) => _.kebabCase(str));
    this.handlebars.registerHelper('snakeCase', (str: string) => _.snakeCase(str));
    this.handlebars.registerHelper('startCase', (str: string) => _.startCase(str));
    this.handlebars.registerHelper('lowerCase', (str: string) => _.lowerCase(str));
    this.handlebars.registerHelper('upperCase', (str: string) => _.upperCase(str));
    this.handlebars.registerHelper('capitalize', (str: string) => _.capitalize(str));
    this.handlebars.registerHelper('upperFirst', (str: string) => _.upperFirst(str));
    this.handlebars.registerHelper('lowerFirst', (str: string) => _.lowerFirst(str));

    this.handlebars.registerHelper('trim', (str: string, chars?: string) =>
      chars ? _.trim(str, chars) : _.trim(str)
    );
    this.handlebars.registerHelper('trimStart', (str: string, chars?: string) =>
      chars ? _.trimStart(str, chars) : _.trimStart(str)
    );
    this.handlebars.registerHelper('trimEnd', (str: string, chars?: string) =>
      chars ? _.trimEnd(str, chars) : _.trimEnd(str)
    );

    this.handlebars.registerHelper('padStart', (str: string, length: number, chars?: string) =>
      _.padStart(str, length, chars)
    );
    this.handlebars.registerHelper('padEnd', (str: string, length: number, chars?: string) =>
      _.padEnd(str, length, chars)
    );

    this.handlebars.registerHelper('repeat', (str: string, count: number) =>
      _.repeat(str, count)
    );

    this.handlebars.registerHelper('truncate', (str: string, length: number, omission?: string) =>
      _.truncate(str, { length, omission })
    );

    // ==================== LODASH UTILITY HELPERS ====================

    this.handlebars.registerHelper('size', (value: any) => _.size(value));
    this.handlebars.registerHelper('isEmpty', (value: any) => _.isEmpty(value));
    this.handlebars.registerHelper('isArray', (value: any) => _.isArray(value));
    this.handlebars.registerHelper('isObject', (value: any) => _.isObject(value));
    this.handlebars.registerHelper('isString', (value: any) => _.isString(value));
    this.handlebars.registerHelper('isNumber', (value: any) => _.isNumber(value));
    this.handlebars.registerHelper('isBoolean', (value: any) => _.isBoolean(value));
    this.handlebars.registerHelper('isNull', (value: any) => _.isNull(value));
    this.handlebars.registerHelper('isUndefined', (value: any) => _.isUndefined(value));
    this.handlebars.registerHelper('isNil', (value: any) => _.isNil(value));

    // ==================== ENHANCED HELPERS ====================

    // Join helper with lodash
    this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') =>
      _.join(array, separator)
    );

    // Map and join combined
    this.handlebars.registerHelper('mapJoin', (array: any[], property: string, separator: string = ', ') =>
      _.join(_.map(array, property), separator)
    );

    // Length helper
    this.handlebars.registerHelper('length', (value: any) => _.size(value));

    // ==================== CONDITIONAL HELPERS ====================

    this.handlebars.registerHelper('ternary', (condition: any, truthyValue: any, falsyValue: any) =>
      condition ? truthyValue : falsyValue
    );

    this.handlebars.registerHelper('or', (...args: any[]) => {
      args.pop(); // Remove Handlebars options
      return args.find(arg => !!arg) || args[args.length - 1];
    });

    this.handlebars.registerHelper('and', (...args: any[]) => {
      args.pop(); // Remove Handlebars options
      return args.every(arg => !!arg) ? args[args.length - 1] : false;
    });

    this.handlebars.registerHelper('not', (value: any) => !value);

    this.handlebars.registerHelper('default', (value: any, defaultValue: any) =>
      _.isNil(value) || value === '' ? defaultValue : value
    );

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => _.isEqual(a, b));
    this.handlebars.registerHelper('ne', (a: any, b: any) => !_.isEqual(a, b));
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);

    // ==================== JSON HELPERS ====================

    this.handlebars.registerHelper('stringify', (obj: any) => JSON.stringify(obj));

    this.handlebars.registerHelper('parse', (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    });

    // ==================== OBJECT CREATION HELPERS ====================

    this.handlebars.registerHelper('object', function(options: any) {
      return options?.hash || {};
    });

    this.handlebars.registerHelper('string', function(options: any) {
      return String(options);
    });

    this.handlebars.registerHelper('number', function(options: any) {
      return Number(options);
    });

    this.handlebars.registerHelper('typeof', function(options: any) {
      return typeof options;
    });

    this.handlebars.registerHelper('boolean', function(options: any) {
      return !!options;
    });


    this.handlebars.registerHelper('array', function(...args: any[]) {
      args.pop(); // Remove Handlebars options
      return args;
    });

    // ==================== MATH HELPERS ====================

    this.handlebars.registerHelper('add', (a: number, b: number) => _.add(a, b));
    this.handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
    this.handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
    this.handlebars.registerHelper('divide', (a: number, b: number) => b !== 0 ? a / b : 0);
    this.handlebars.registerHelper('mod', (a: number, b: number) => a % b);
    this.handlebars.registerHelper('pow', (a: number, b: number) => Math.pow(a, b));
    this.handlebars.registerHelper('sqrt', (a: number) => Math.sqrt(a));
    this.handlebars.registerHelper('abs', (a: number) => Math.abs(a));
    this.handlebars.registerHelper('round', (a: number, precision?: number) =>
      precision !== undefined ? _.round(a, precision) : Math.round(a)
    );
    this.handlebars.registerHelper('ceil', (a: number, precision?: number) =>
      precision !== undefined ? _.ceil(a, precision) : Math.ceil(a)
    );
    this.handlebars.registerHelper('floor', (a: number, precision?: number) =>
      precision !== undefined ? _.floor(a, precision) : Math.floor(a)
    );
    this.handlebars.registerHelper('random', (min: number, max: number, floating?: boolean) =>
      _.random(min, max, floating)
    );

    // ==================== DATE HELPERS ====================

    this.handlebars.registerHelper('now', () => new Date());
    this.handlebars.registerHelper('timestamp', () => Date.now());
    this.handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';

      switch (format) {
        case 'iso': return d.toISOString();
        case 'date': return d.toLocaleDateString();
        case 'time': return d.toLocaleTimeString();
        default: return d.toString();
      }
    });
  }
}