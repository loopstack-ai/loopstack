import { z } from 'zod';
import { BlockConfigSchema } from '../../schemas/index.js';

export interface ConfigSourceInterface {
  path: string;
  relativePath: string;
  raw: string;
  config: Partial<BlockConfigType>;
}

export type BlockConfigType = z.infer<typeof BlockConfigSchema>;
