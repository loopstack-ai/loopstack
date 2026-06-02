import { z } from 'zod';
import { BlockConfigSchema } from '../../schemas/index.js';

export type BlockConfigType = z.infer<typeof BlockConfigSchema>;
