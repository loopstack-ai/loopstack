import { Injectable } from '@nestjs/common';

@Injectable()
export class OperatorsHelperService {
  // Equality operators
  getEqualsHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeCompare(left, right, (a, b) => a === b);
    };
  }

  getNotEqualsHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeCompare(left, right, (a, b) => a !== b);
    };
  }

  getLooseEqualsHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeCompare(left, right, (a, b) => a == b);
    };
  }

  getLooseNotEqualsHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeCompare(left, right, (a, b) => a != b);
    };
  }

  // Comparison operators
  getGreaterThanHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeNumericCompare(left, right, (a, b) => a > b);
    };
  }

  getGreaterThanOrEqualHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeNumericCompare(left, right, (a, b) => a >= b);
    };
  }

  getLessThanHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeNumericCompare(left, right, (a, b) => a < b);
    };
  }

  getLessThanOrEqualHelper() {
    return (...args: unknown[]): boolean => {
      const [left, right] = args.slice(0, -1) as [unknown, unknown];
      return this.safeNumericCompare(left, right, (a, b) => a <= b);
    };
  }

  // Logical operators
  getAndHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length === 0) {
        throw new Error('AND helper requires at least one argument');
      }
      return values.every((val) => this.safeTruthy(val));
    };
  }

  getOrHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length === 0) {
        throw new Error('OR helper requires at least one argument');
      }
      return values.some((val) => this.safeTruthy(val));
    };
  }

  getNotHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('NOT helper requires exactly one argument');
      }
      const [value] = values;
      return !this.safeTruthy(value);
    };
  }

  // String operators
  getContainsHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('CONTAINS helper requires exactly two arguments (haystack, needle)');
      }
      const [haystack, needle] = values;
      return this.safeStringOperation(haystack, needle, (h, n) => h.includes(n));
    };
  }

  getStartsWithHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('STARTS_WITH helper requires exactly two arguments (string, prefix)');
      }
      const [str, prefix] = values;
      return this.safeStringOperation(str, prefix, (s, p) => s.startsWith(p));
    };
  }

  getEndsWithHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('ENDS_WITH helper requires exactly two arguments (string, suffix)');
      }
      const [str, suffix] = values;
      return this.safeStringOperation(str, suffix, (s, p) => s.endsWith(p));
    };
  }

  getRegexTestHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length < 2 || values.length > 3) {
        throw new Error('REGEX_TEST helper requires 2 or 3 arguments (string, pattern, [flags])');
      }
      const [str, pattern, flags] = values;

      const safeStr = this.sanitizeString(str);
      const safePattern = this.sanitizeString(pattern);
      const safeFlags = flags ? this.sanitizeString(flags) : '';

      // Validate regex flags
      if (safeFlags && !/^[gimuy]*$/.test(safeFlags)) {
        throw new Error(`Invalid regex flags: ${safeFlags}. Only g, i, m, u, y are allowed.`);
      }

      const regex = new RegExp(safePattern, safeFlags);
      return regex.test(safeStr);
    };
  }

  // Array/Object operators
  getInHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('IN helper requires exactly two arguments (needle, haystack)');
      }
      const [needle, haystack] = values;

      if (Array.isArray(haystack)) {
        return (haystack as unknown[]).includes(needle);
      }
      if (typeof haystack === 'object' && haystack !== null) {
        return String(needle) in haystack;
      }
      throw new Error('IN helper: haystack must be an array or object');
    };
  }

  getLengthHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('LENGTH helper requires exactly one argument');
      }
      const [value] = values;

      if (value === null || value === undefined) {
        return 0;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'object') {
        return Object.keys(value).length;
      }
      throw new Error(`LENGTH helper: unsupported type ${typeof value}`);
    };
  }

  getIsEmptyHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_EMPTY helper requires exactly one argument');
      }
      const [value] = values;

      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length === 0;
      }
      if (typeof value === 'object') {
        return Object.keys(value).length === 0;
      }
      return false;
    };
  }

  // Type checking operators
  getTypeOfHelper() {
    return (...args: unknown[]): string => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('TYPE_OF helper requires exactly one argument');
      }
      const [value] = values;

      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    };
  }

  getIsNullHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_NULL helper requires exactly one argument');
      }
      const [value] = values;
      return value === null;
    };
  }

  getIsUndefinedHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_UNDEFINED helper requires exactly one argument');
      }
      const [value] = values;
      return value === undefined;
    };
  }

  getIsNumberHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_NUMBER helper requires exactly one argument');
      }
      const [value] = values;
      return typeof value === 'number' && !isNaN(value);
    };
  }

  getIsStringHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_STRING helper requires exactly one argument');
      }
      const [value] = values;
      return typeof value === 'string';
    };
  }

  getIsBooleanHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_BOOLEAN helper requires exactly one argument');
      }
      const [value] = values;
      return typeof value === 'boolean';
    };
  }

  getIsArrayHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_ARRAY helper requires exactly one argument');
      }
      const [value] = values;
      return Array.isArray(value);
    };
  }

  getIsObjectHelper() {
    return (...args: unknown[]): boolean => {
      const values = args.slice(0, -1);
      if (values.length !== 1) {
        throw new Error('IS_OBJECT helper requires exactly one argument');
      }
      const [value] = values;
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    };
  }

  // Mathematical operators
  getAddHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length === 0) {
        throw new Error('ADD helper requires at least one argument');
      }
      return values.reduce<number>((sum, val) => sum + this.safeNumber(val), 0);
    };
  }

  getSubtractHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('SUBTRACT helper requires exactly two arguments (left, right)');
      }
      const [left, right] = values;
      return this.safeNumber(left) - this.safeNumber(right);
    };
  }

  getMultiplyHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('MULTIPLY helper requires exactly two arguments (left, right)');
      }
      const [left, right] = values;
      return this.safeNumber(left) * this.safeNumber(right);
    };
  }

  getDivideHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('DIVIDE helper requires exactly two arguments (left, right)');
      }
      const [left, right] = values;
      const rightNum = this.safeNumber(right);
      if (rightNum === 0) {
        throw new Error('Division by zero is not allowed');
      }
      return this.safeNumber(left) / rightNum;
    };
  }

  getModuloHelper() {
    return (...args: unknown[]): number => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('MODULO helper requires exactly two arguments (left, right)');
      }
      const [left, right] = values;
      const rightNum = this.safeNumber(right);
      if (rightNum === 0) {
        throw new Error('Modulo by zero is not allowed');
      }
      return this.safeNumber(left) % rightNum;
    };
  }

  // Default/fallback helper
  getDefaultHelper() {
    return (...args: unknown[]): unknown => {
      const values = args.slice(0, -1);
      if (values.length !== 2) {
        throw new Error('DEFAULT helper requires exactly two arguments (value, defaultValue)');
      }
      const [value, defaultValue] = values;
      return this.safeTruthy(value) ? value : defaultValue;
    };
  }

  // Private security and utility methods
  private safeCompare(left: unknown, right: unknown, compareFn: (a: unknown, b: unknown) => boolean): boolean {
    const safeLeft = this.sanitizeValue(left);
    const safeRight = this.sanitizeValue(right);
    return compareFn(safeLeft, safeRight);
  }

  private safeNumericCompare(left: unknown, right: unknown, compareFn: (a: number, b: number) => boolean): boolean {
    const leftNum = this.safeNumber(left);
    const rightNum = this.safeNumber(right);
    return compareFn(leftNum, rightNum);
  }

  private safeStringOperation(str: unknown, other: unknown, operation: (s: string, o: string) => boolean): boolean {
    const safeStr = this.sanitizeString(str);
    const safeOther = this.sanitizeString(other);
    return operation(safeStr, safeOther);
  }

  private sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Prevent prototype pollution
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj.constructor !== Object && obj.constructor !== Array) {
        throw new Error(`Unsafe object constructor: ${obj.constructor.name}`);
      }

      // Remove dangerous properties
      if (Array.isArray(value)) {
        const sanitized: unknown[] = [];
        for (const key in obj) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new Error(`Dangerous property access attempt: ${key}`);
          }
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key as unknown as number] = this.sanitizeValue(obj[key]);
          }
        }
        return sanitized;
      } else {
        const sanitized: Record<string, unknown> = {};
        for (const key in obj) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new Error(`Dangerous property access attempt: ${key}`);
          }
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = this.sanitizeValue(obj[key]);
          }
        }
        return sanitized;
      }
    }

    return value;
  }

  private sanitizeString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value as string | number | boolean | bigint | symbol);
  }

  private safeNumber(value: unknown): number {
    if (typeof value === 'number') {
      if (isNaN(value)) {
        throw new Error('NaN is not a valid number');
      }
      if (!isFinite(value)) {
        throw new Error('Infinite values are not allowed');
      }
      return value;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`Cannot convert "${value}" to a number`);
      }
      if (!isFinite(num)) {
        throw new Error(`"${value}" results in an infinite value`);
      }
      return num;
    }
    throw new Error(`Cannot convert ${typeof value} to number`);
  }

  private safeTruthy(value: unknown): boolean {
    const sanitized = this.sanitizeValue(value);
    return !!sanitized;
  }
}
