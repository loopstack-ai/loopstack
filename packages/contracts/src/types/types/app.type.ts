import { z } from 'zod';
import { AppSchema } from '../../schemas/index.js';

export type AppType = z.infer<typeof AppSchema>;
