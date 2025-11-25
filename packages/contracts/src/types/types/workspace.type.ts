import { z } from 'zod';
import { WorkspaceSchema } from '../../schemas';

export type WorkspaceType = z.infer<typeof WorkspaceSchema>;