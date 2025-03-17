import { z } from 'zod';

export const ServiceConfigSchema = z.object({
  service: z.string(),
  name: z.string(),
  props: z.any().optional(),
});

export type ServiceConfigType = z.infer<typeof ServiceConfigSchema>;
