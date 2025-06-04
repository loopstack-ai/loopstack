import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  AdapterInterface,
  AdapterOptionsInterface,
  LOOP_ADAPTER_DECORATOR,
} from '@loopstack/shared';

@Injectable()
export class AdapterRegistry {
  private readonly logger = new Logger(AdapterRegistry.name);
  private adapters: Map<string, { options: AdapterOptionsInterface; instance: AdapterInterface }> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options: AdapterOptionsInterface = this.reflector.get(
        LOOP_ADAPTER_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.logger.debug(`Register Adapter ${instance.constructor.name} as ${options.name}`);
        this.registerAdapter(options, instance);
      }
    }
  }

  getAdapterByName(name: string): { options: AdapterOptionsInterface; instance: AdapterInterface } {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter ${name} not found.`);
    }

    return adapter;
  }

  private registerAdapter(options: AdapterOptionsInterface, instance: AdapterInterface) {
    if (this.adapters.has(options.name)) {
      throw new Error(`Duplicate adapter registration: "${options.name}"`);
    }

    this.adapters.set(options.name, { options, instance });
  }

  getEntries(): Array<{ options: AdapterOptionsInterface; instance: AdapterInterface }> {
    return Array.from(this.adapters.values());
  }
}
