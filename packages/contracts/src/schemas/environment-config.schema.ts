import { z } from 'zod';
import { EnvironmentType } from '../enums';

export const EnvironmentConfigSchema = z.object({
  id: z.string(),
  type: z.union([z.enum([EnvironmentType.Sandbox, EnvironmentType.Production]), z.string()]),
  title: z.string().optional(),
});
