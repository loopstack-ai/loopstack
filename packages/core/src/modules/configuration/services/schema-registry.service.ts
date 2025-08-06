import { jsonSchemaToZod } from 'json-schema-to-zod';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SchemaRegistry {
  private logger = new Logger(SchemaRegistry.name);
  private zodSchemas: Map<string, z.ZodSchema> = new Map();

  public createZod(jsonSchema: any): z.ZodType {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    return new Function('z', `return ${zodSchemaString}`)(z);
  }

  public addJSONSchema(key: string, jsonSchema: any): void {
    try {
      const zodSchema = this.createZod(jsonSchema);
      this.zodSchemas.set(key, zodSchema);
    } catch (error) {
      throw new Error(
        `Failed to create zod schema for '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  public getZodSchema(path: string): z.ZodType | undefined {
    return this.zodSchemas.get(path);
  }

  public getSize() {
    return this.zodSchemas.size;
  }
}
