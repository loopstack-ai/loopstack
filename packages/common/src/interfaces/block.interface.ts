import type { BlockConfigType } from '@loopstack/contracts/types';

export interface BlockOptions {
  type?: string;
  config?: Partial<BlockConfigType>;
  configFile?: string;
}