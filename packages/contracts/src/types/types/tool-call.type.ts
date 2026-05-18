import { z } from 'zod';
import { ToolCallConfigSchema } from '../../schemas/index.js';

export type ToolCallType = z.infer<typeof ToolCallConfigSchema>;
