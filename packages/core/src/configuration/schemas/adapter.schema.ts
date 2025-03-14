import { z } from "zod";
import { DynamicSchemasInterface } from '../services/dynamic-schema-generator.service';

export const AdapterConfigDefaultSchema = z.object({
  name: z.string(),
  adapter: z.string(),
  props: z.any().optional(),
})

export type AdapterConfigDefaultType = z.infer<typeof AdapterConfigDefaultSchema>;

export const AdapterSchema = (dynamicSchemas: DynamicSchemasInterface) => dynamicSchemas.adapterConfigSchemas;