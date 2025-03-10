import { z } from "zod";

export const AdapterSchema = z.object({
  name: z.string(),
  props: z.object({
    llm: z.object({
      model: z.string(),
      baseUrl: z.string().optional(),
    }).optional(),
  })
});

export type AdapterType = z.infer<typeof AdapterSchema>;
