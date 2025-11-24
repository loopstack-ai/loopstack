import { z } from "zod";

export const JSONSchemaType: z.ZodType<any> = z.lazy(() =>
    z.object({
        // Type validators
        type: z.union([
            z.enum(["string", "number", "integer", "boolean", "array", "object", "null", "any"]),
            z.array(z.enum(["string", "number", "integer", "boolean", "array", "object", "null"]))
        ]).optional(),

        // Core schema metadata
        $id: z.string().optional(),
        $schema: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        default: z.any().optional(),

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
        enum: z.array(z.any()).optional(),
        const: z.any().optional(),

        // Schema composition
        definitions: z.record(JSONSchemaType).optional(),
        $ref: z.string().optional(),
    })
);

export interface JSONSchemaConfigType extends z.infer<typeof JSONSchemaType> {}