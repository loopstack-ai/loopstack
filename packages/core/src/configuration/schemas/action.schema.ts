import { z } from "zod";
import { DynamicSchemasInterface } from '../services/dynamic-schema-generator.service';

export const ActionConfigDefaultSchema = z.object({
    name: z.string(),
    service: z.string(),
    props: z.any().optional(),
})

export type ActionConfigDefaultType = z.infer<typeof ActionConfigDefaultSchema>;

export const ActionSchema = (dynamicSchemas: DynamicSchemasInterface) => dynamicSchemas.actionConfigSchemas;

