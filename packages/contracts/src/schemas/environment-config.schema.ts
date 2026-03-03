import { z } from 'zod';
import { EnvironmentType } from '../enums';

export const EnvironmentConfigSchema = z.object({
  id: z.string(),
  type: z.enum([EnvironmentType.Sandbox, EnvironmentType.Production]),
  title: z.string().optional(),
});
