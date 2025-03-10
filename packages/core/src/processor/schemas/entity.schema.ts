import { z } from "zod";

export const EntitySchema = z.object({
    name: z.string(),
    schema: z.record(z.any()).optional(),
    validator: z.string().optional(),
    entity: z.string().optional(),
}).refine((data) => data.schema || data.entity, {
    message: "Either schema or entity must be provided",
});

export type EntityType = z.infer<typeof EntitySchema>