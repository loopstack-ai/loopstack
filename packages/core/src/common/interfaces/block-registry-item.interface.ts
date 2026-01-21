import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

export interface BlockRegistryItem {
  name: string;
  provider: InstanceWrapper;
}
