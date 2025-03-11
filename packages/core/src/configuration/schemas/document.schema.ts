import { z } from "zod";
import { FormUISchema, JSONSchemaType } from '@loopstack/shared';

export const DocumentSchema = z.object({
    name: z.string(),
    schema: JSONSchemaType,
    uiSchema: FormUISchema.optional(),
});
export type DocumentType = z.infer<typeof DocumentSchema>;