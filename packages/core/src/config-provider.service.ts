import {
  ConfigProvider,
  ConfigProviderInterface,
  MainConfigType,
} from '@loopstack/shared';
import { loadConfiguration } from './utils';
import { Injectable } from '@nestjs/common';
import path from 'path';

@Injectable()
@ConfigProvider()
export class ConfigProviderService implements ConfigProviderInterface {
  getConfig(): Record<string, MainConfigType[]> {
    const configPath = path.join(__dirname, 'config');
    return { [configPath]: loadConfiguration(configPath) };
  }
}
