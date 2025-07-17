import {
  ConfigProvider,
  ConfigProviderInterface,
  ConfigSourceInterface,
} from '@loopstack/shared';
import { loadConfiguration } from './utils';
import path from 'path';

@ConfigProvider()
export class ConfigProviderService implements ConfigProviderInterface {
  getConfig(): Record<string, ConfigSourceInterface[]> {
    const configPath = path.join(__dirname, 'config');
    return { ['core']: loadConfiguration(configPath) };
  }
}
