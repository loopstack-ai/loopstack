import { z } from "zod";
import { DynamicSchemasInterface } from './main-schema-generator';

export const ActionConfigDefaultSchema = z.object({
    name: z.string(),
    service: z.string(),
    inputs: z.array(z.string()).optional(),
    output: z.string().optional(),
    props: z.object({}),
})

export type ActionConfigDefaultType = z.infer<typeof ActionConfigDefaultSchema>;

export const ActionSchema = (dynamicSchemas: DynamicSchemasInterface) => ActionConfigDefaultSchema.extend({
    props: dynamicSchemas.actionConfigSchema,
});

