import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  MainConfigType,
  CONFIG_PROVIDER_DECORATOR,
  ConfigProviderInterface,
  AdapterInterface,
} from '@loopstack/shared';

@Injectable()
export class ConfigProviderRegistry {
  private readonly logger = new Logger(ConfigProviderRegistry.name);
  private configs: Record<string, MainConfigType[]> = {};

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance: ConfigProviderInterface = provider.instance;
      if (!instance || !instance.constructor) continue;

      const isConfigProvider = this.reflector.get<{ module: string }>(
        CONFIG_PROVIDER_DECORATOR,
        instance.constructor,
      );

      if (isConfigProvider) {
        this.registerModuleConfig(instance);
      }
    }
  }

  private registerModuleConfig(instance: ConfigProviderInterface) {
    const moduleConfigs = instance.getConfig();

    this.logger.debug(
      `Including configs from ${Object.keys(moduleConfigs).join(', ')}`,
    );

    this.configs = {
      ...this.configs,
      ...moduleConfigs,
    };
  }

  getConfigs(): MainConfigType[] {
    return Array.from(Object.values(this.configs)).flat();
  }
}
