import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { BlockMetadata } from '@loopstack/common';
import { BlockConfigType } from '@loopstack/contracts/types';

export interface BlockRegistryItem {
  name: string;
  provider: InstanceWrapper;
  metadata: BlockMetadata;
  configSource?: string;
  config: BlockConfigType;
}
