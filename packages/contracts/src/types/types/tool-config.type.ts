import { z } from 'zod';
import { ToolConfigSchema } from '../../schemas';

export type ToolConfigType = z.infer<typeof ToolConfigSchema>;
