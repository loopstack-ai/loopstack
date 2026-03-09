import { z } from 'zod';

export const EnvironmentConfigSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  type: z.string().optional(),
  optional: z.boolean().optional(),
});
