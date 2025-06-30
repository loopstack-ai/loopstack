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

  /**
   * Add a schema with security validation
   */
  public addSchema(prefix: string, name: string, jsonSchema: any): void {
    const key = `${prefix}.${name}`;

    this.validateSecureSchema(jsonSchema);

    try {

      const zodSchema = this.createZod(jsonSchema);
      this.zodSchemas.set(key, zodSchema);

      // Auto-register property paths for object schemas
      if (jsonSchema.type === 'object') {
        this.registerPropertyPaths(prefix, name, jsonSchema);
      }
    } catch (error) {
      throw new Error(`Failed to process schema '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register individual property paths from an object schema
   */
  private registerPropertyPaths(prefix: string, rootName: string, jsonSchema: any, currentPath: string = ''): void {
    if (jsonSchema.type !== 'object' || !jsonSchema.properties) {
      return;
    }

    for (const [propName, propSchema] of Object.entries(jsonSchema.properties)) {
      const fullPath = currentPath ? `${currentPath}.${propName}` : propName;
      const schemaKey = `${prefix}.${rootName}.${fullPath}`;

      // Every property must have a type declared
      if (!(propSchema as any).type) {
        continue;
        // throw new Error(`Property '${fullPath}' in schema '${prefix}.${rootName}' must have a type declared`);
      }

      const propertyZodSchema = this.createZod(propSchema);

      this.zodSchemas.set(schemaKey, propertyZodSchema);

      // Recursively register nested object properties
      if ((propSchema as any).type === 'object') {
        this.registerPropertyPaths(prefix, rootName, propSchema as any, fullPath);
      }

      // Handle array items that are objects
      if ((propSchema as any).type === 'array' && (propSchema as any).items) {
        const itemsSchema = (propSchema as any).items;
        if (!itemsSchema.type) {
          throw new Error(`Array items in property '${fullPath}' must have a type declared`);
        }

        const arrayItemPath = `${fullPath}[]`;
        const arrayItemKey = `${prefix}.${rootName}.${arrayItemPath}`;

        const itemZodSchema = this.createZod(itemsSchema);
        this.zodSchemas.set(arrayItemKey, itemZodSchema);

        if ((propSchema as any).items.type === 'object') {
          this.registerPropertyPaths(prefix, rootName, itemsSchema, arrayItemPath);
        }
      }
    }
  }

  /**
   * Get all registered schema keys (for debugging)
   */
  public getRegisteredSchemas(): string[] {
    return Array.from(this.zodSchemas.keys()).sort();
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