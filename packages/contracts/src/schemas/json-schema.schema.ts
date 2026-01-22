import { z } from 'zod';

export interface JSONSchemaDefinition {
  type?:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'array'
    | 'object'
    | 'null'
    | 'any'
    | Array<'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'>;
  $id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  multipleOf?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  items?: JSONSchemaDefinition | JSONSchemaDefinition[];
  additionalItems?: boolean | JSONSchemaDefinition;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchemaDefinition;
  properties?: Record<string, JSONSchemaDefinition>;
  patternProperties?: Record<string, JSONSchemaDefinition>;
  additionalProperties?: boolean | JSONSchemaDefinition;
  required?: string[];
  propertyNames?: JSONSchemaDefinition;
  minProperties?: number;
  maxProperties?: number;
  allOf?: JSONSchemaDefinition[];
  anyOf?: JSONSchemaDefinition[];
  oneOf?: JSONSchemaDefinition[];
  not?: JSONSchemaDefinition;
  if?: JSONSchemaDefinition;
  then?: JSONSchemaDefinition;
  else?: JSONSchemaDefinition;
  enum?: unknown[];
  const?: unknown;
  definitions?: Record<string, JSONSchemaDefinition>;
  $ref?: string;
}

export const JSONSchemaType: z.ZodType<JSONSchemaDefinition> = z.lazy(() =>
  z.object({
    // Type validators
    type: z
      .union([
        z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null', 'any']),
        z.array(z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'])),
      ])
      .optional(),

    // Core schema metadata
    $id: z.string().optional(),
    $schema: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    default: z.unknown().optional(),

    // String validators
    minLength: z.number().int().optional(),
    maxLength: z.number().int().optional(),
    pattern: z.string().optional(),
    format: z.string().optional(),

    // Number validators
    multipleOf: z.number().positive().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    exclusiveMinimum: z.union([z.boolean(), z.number()]).optional(),
    exclusiveMaximum: z.union([z.boolean(), z.number()]).optional(),

    // Array validators
    items: z.union([JSONSchemaType, z.array(JSONSchemaType)]).optional(),
    additionalItems: z.union([z.boolean(), JSONSchemaType]).optional(),
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().nonnegative().optional(),
    uniqueItems: z.boolean().optional(),
    contains: JSONSchemaType.optional(),

    // Object validators
    properties: z.record(JSONSchemaType).optional(),
    patternProperties: z.record(JSONSchemaType).optional(),
    additionalProperties: z.union([z.boolean(), JSONSchemaType]).optional(),
    required: z.array(z.string()).optional(),
    propertyNames: JSONSchemaType.optional(),
    minProperties: z.number().int().nonnegative().optional(),
    maxProperties: z.number().int().nonnegative().optional(),

    // Logic validators
    allOf: z.array(JSONSchemaType).optional(),
    anyOf: z.array(JSONSchemaType).optional(),
    oneOf: z.array(JSONSchemaType).optional(),
    not: JSONSchemaType.optional(),

    // Conditional validators
    if: JSONSchemaType.optional(),
    then: JSONSchemaType.optional(),
    else: JSONSchemaType.optional(),

    // Other validators
    enum: z.array(z.unknown()).optional(),
    const: z.unknown().optional(),

    // Schema composition
    definitions: z.record(JSONSchemaType).optional(),
    $ref: z.string().optional(),
  }),
);
