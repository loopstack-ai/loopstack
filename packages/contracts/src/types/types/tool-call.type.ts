import { z } from 'zod';
import { ToolCallSchema } from '../../schemas';

export type ToolCallType = z.infer<typeof ToolCallSchema>;