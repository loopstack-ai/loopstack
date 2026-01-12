import { z } from 'zod';
import { ToolCallConfigSchema } from '../../schemas';

export type ToolCallType = z.infer<typeof ToolCallConfigSchema>;
