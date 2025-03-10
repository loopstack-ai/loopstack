import { z } from "zod";
import { DynamicSchemasInterface } from '../services/dynamic-schema-generator.service';

export const ActionConfigDefaultSchema = z.object({
    name: z.string(),
    service: z.string(),
    inputs: z.array(z.string()).optional(),
    output: z.string().optional(),
    props: z.object({}),
})

export type ActionConfigDefaultType = z.infer<typeof ActionConfigDefaultSchema>;

export const ActionSchema = (dynamicSchemas: DynamicSchemasInterface) => dynamicSchemas.actionConfigSchemas;

