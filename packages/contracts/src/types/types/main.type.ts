import { z } from 'zod';
import { BlockConfigSchema } from '../../schemas';

export interface ConfigSourceInterface {
  path: string;
  relativePath: string;
  raw: string;
  config: any;
}

export type BlockConfigType = z.infer<typeof BlockConfigSchema>;
