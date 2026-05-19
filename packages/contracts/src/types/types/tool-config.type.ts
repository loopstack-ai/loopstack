import { z } from 'zod';
import { ToolConfigSchema } from '../../schemas/index.js';

export type ToolConfigType = z.infer<typeof ToolConfigSchema>;
