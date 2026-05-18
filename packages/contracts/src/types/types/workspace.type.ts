import { z } from 'zod';
import { WorkspaceSchema } from '../../schemas/index.js';

export type WorkspaceType = z.infer<typeof WorkspaceSchema>;
