import {
  ConfigProvider,
  ConfigProviderInterface,
  ConfigSourceInterface, MODULE_NAME_TOKEN,
} from '@loopstack/shared';
import { loadConfiguration } from './utils';
import { join } from 'node:path';
import { Inject } from '@nestjs/common';

@ConfigProvider()
export class ConfigProviderService implements ConfigProviderInterface {
  constructor(@Inject(MODULE_NAME_TOKEN) private readonly moduleName: string) {}

  getConfig(): Record<string, ConfigSourceInterface[]> {
    const configPath = join(__dirname, 'config');
    return { [this.moduleName]: loadConfiguration(configPath) };
  }
}
