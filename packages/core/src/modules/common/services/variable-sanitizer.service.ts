import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VariableSanitizerService {
  private readonly logger = new Logger(VariableSanitizerService.name);
  private readonly MAX_SANITIZATION_DEPTH = 20;

  public sanitizeVariables(
    variables: Record<string, any>,
    depth: number = 0,
  ): Record<string, any> {
    // Prevent infinite recursion
    if (depth > this.MAX_SANITIZATION_DEPTH) {
      this.logger.warn(
        `Sanitization depth limit reached: ${this.MAX_SANITIZATION_DEPTH}`,
      );
      return {};
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (this.shouldSkipProperty(key, value)) {
        continue;
      }

      sanitized[key] = this.sanitizeValue(value, depth + 1);
    }

    return sanitized;
  }

  private shouldSkipProperty(key: string, value: any): boolean {
    // Skip dangerous property names
    if (
      key.startsWith('__') ||
      ['prototype', 'constructor', '__proto__'].includes(key)
    ) {
      return true;
    }

    // Skip functions
    if (typeof value === 'function') {
      return true;
    }

    // Skip symbols
    if (typeof value === 'symbol') {
      return true;
    }

    return false;
  }

  private sanitizeValue(value: any, depth: number): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return this.sanitizeArray(value, depth);
    }

    if (value instanceof Date) {
      return value;
    }

    if (value instanceof RegExp) {
      return value.toString();
    }

    if (this.isPlainObject(value)) {
      return this.sanitizeVariables(value, depth);
    }

    // For other object types, convert to string or return null
    try {
      return value.toString();
    } catch {
      return null;
    }
  }

  private sanitizeArray(arr: any[], depth: number): any[] {
    return arr
      .filter((item) => typeof item !== 'function' && typeof item !== 'symbol')
      .map((item) => this.sanitizeValue(item, depth));
  }

  private isPlainObject(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    return true;

    // Check if it's a plain object (not a class instance, Date, etc.)
    // const proto = Object.getPrototypeOf(obj);
    // return proto === null || proto === Object.prototype;
  }
}
