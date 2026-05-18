import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';

export interface BlockRegistryItem {
  name: string;
  provider: InstanceWrapper;
}
