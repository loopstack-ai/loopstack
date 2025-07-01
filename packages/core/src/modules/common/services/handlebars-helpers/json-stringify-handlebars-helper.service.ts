import { Injectable } from '@nestjs/common';
import { SchemaRegistry } from '../../../configuration';
import { z } from 'zod';

@Injectable()
export class JsonStringifyHandlebarsHelperService {

  private static readonly MAX_JSON_SIZE = 10000;

  constructor(
    private readonly schemaRegistry: SchemaRegistry,
  ) {}

  getJSONStringifyHelper() {
    return (...args: any[]): string => {
      const [value, path, isUnsecure] = args.slice(0, -1);

      if (typeof path !== 'string') {
        throw new Error(`jsonStringify path must be a string, got: ${typeof path}`);
      }

      if (value === undefined) {
        return 'undefined';
      }

      if (isUnsecure) {
        return JSON.stringify(value);
      }

      if (!this.schemaRegistry.hasSchema(path)) {
        throw new Error(`Schema path '${path}' not found`);
      }

      try {
        const zodSchema = this.schemaRegistry.getZodSchema(path)!;
        const safeValue = zodSchema.parse(value);
        const jsonString = JSON.stringify(safeValue);

        if (jsonString.length > JsonStringifyHandlebarsHelperService.MAX_JSON_SIZE) {
          throw new Error(`JSON output too large: ${jsonString.length} > ${JsonStringifyHandlebarsHelperService.MAX_JSON_SIZE} characters`);
        }

        return jsonString;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Schema validation failed for '${path}': ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error; // Re-throw other errors (including size limit error)
      }
    }
  }

}