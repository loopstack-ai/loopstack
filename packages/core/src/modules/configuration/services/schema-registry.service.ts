import { jsonSchemaToZod } from 'json-schema-to-zod';
import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SchemaRegistry {
  private logger = new Logger(SchemaRegistry.name);
  private zodSchemas: Map<string, z.ZodSchema> = new Map();

  private createZod(jsonSchema: any): z.ZodType {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    return new Function('z', `return ${zodSchemaString}`)(z);
  }

  public addZodSchema(key: string, schema: z.ZodType): void {
    // const unwrappedSchema = this.unwrapZodSchema(schema);

    try {
      // this.zodSchemas.set(key, unwrappedSchema);
      // if (unwrappedSchema instanceof z.ZodObject) {
        this.registerZodPropertyPaths(key, schema);
      // }
    } catch (error) {
      throw new Error(`Failed to process schema '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public addJSONSchema(key: string, jsonSchema: any): void {
    this.validateSecureSchema(jsonSchema);
    try {
      const zodSchema = this.createZod(jsonSchema);
      this.addZodSchema(key, zodSchema);
    } catch (error) {
      throw new Error(`Failed to create zod schema for '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unwrap a Zod schema by removing all wrapper types (optional, nullable, default, etc.)
   */
  private unwrapZodSchema(schema: z.ZodType): z.ZodType {
    if (schema instanceof z.ZodOptional) {
      return this.unwrapZodSchema(schema.unwrap());
    }
    if (schema instanceof z.ZodNullable) {
      return this.unwrapZodSchema(schema.unwrap());
    }
    if (schema instanceof z.ZodDefault) {
      return this.unwrapZodSchema(schema.removeDefault());
    }
    if (schema instanceof z.ZodEffects) {
      return this.unwrapZodSchema(schema.innerType());
    }
    return schema;
  }

  /**
   * Register individual property paths from a Zod schema
   */
  private registerZodPropertyPaths(rootName: string, zodSchema: z.ZodType, currentPath: string = ''): void {
    const unwrappedSchema = this.unwrapZodSchema(zodSchema);

    const schemaKey = currentPath ? `${rootName}.${currentPath}` : rootName;
    this.zodSchemas.set(schemaKey, unwrappedSchema);

    if (unwrappedSchema instanceof z.ZodObject) {
      const shape = unwrappedSchema.shape;

      for (const [propName, propSchema] of Object.entries(shape)) {
        const fullPath = currentPath ? `${currentPath}.${propName}` : propName;
        this.registerZodPropertyPaths(rootName, propSchema as z.ZodType, fullPath);
      }
    } else if (unwrappedSchema instanceof z.ZodArray) {
      const arrayItemPath = `${currentPath}[]`;
      const itemSchema = unwrappedSchema.element;
      this.registerZodPropertyPaths(rootName, itemSchema, arrayItemPath);
    }
  }

  /**
   * Get a Zod schema for runtime use
   */
  public getZodSchema(path: string): z.ZodSchema | undefined {
    return this.zodSchemas.get(path);
  }

  /**
   * Check if schema exists
   */
  public hasSchema(path: string): boolean {
    return this.zodSchemas.has(path);
  }

  /**
   * Validate that a schema meets security requirements
   */
  private validateSecureSchema(schema: any, depth = 0) {
    if (depth > 20) {
      throw new Error('Schema nesting too deep (max 20 levels)');
    }

    if (schema.type === 'object') {
      // todo:
      // if (schema.additionalProperties !== false) {
      //   this.logger.debug(schema);
      //   throw new Error('Additional properties must not be allowed');
      // }

      if (schema.properties) {
        for (const propName of Object.keys(schema.properties)) {
          if (this.isDangerousPropertyName(propName)) {
            throw new Error(`Dangerous property names prohibited: ${propName}`);
          }
        }
      }
    }

    // Recursively validate nested objects with depth tracking
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        this.validateSecureSchema(propSchema, depth + 1);
      }
    }

    // Validate array items
    if (schema.items) {
      this.validateSecureSchema(schema.items, depth + 1);
    }

    // Validate union/anyOf/oneOf schemas
    if (schema.anyOf) {
      for (const subSchema of schema.anyOf) {
        this.validateSecureSchema(subSchema, depth + 1);
      }
    }

    if (schema.oneOf) {
      for (const subSchema of schema.oneOf) {
        this.validateSecureSchema(subSchema, depth + 1);
      }
    }
  }

  /**
   * Check if property name is dangerous
   */
  private isDangerousPropertyName(key: string): boolean {
    const dangerous = [
      '__proto__', 'constructor', 'prototype',
      '__defineGetter__', '__defineSetter__',
      'hasOwnProperty', 'toString', 'valueOf'
    ];
    return dangerous.includes(key) || key.startsWith('__');
  }

  public getRegisteredNames() {
    return Array.from(this.zodSchemas.keys());
  }
}