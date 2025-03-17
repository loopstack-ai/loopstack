import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { z, ZodType } from 'zod';
import { AdapterInterface } from '../../processor/interfaces/adapter.interface';
import { LOOP_ADAPTER_DECORATOR } from '../../processor';
import { ServiceWithSchemaInterface } from '../../processor/interfaces/service-with-schema.interface';

@Injectable()
export class AdapterRegistry {
  private adapters: Map<string, AdapterInterface> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options = this.reflector.get<boolean>(
        LOOP_ADAPTER_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.registerAdapter(instance);
      }
    }
  }

  getAdapterByName(name: string): AdapterInterface | undefined {
    return this.adapters.get(name);
  }

  private registerAdapter(instance: AdapterInterface) {
    const name = instance.constructor.name;

    if (this.adapters.has(name)) {
      throw new Error(`Duplicate adapter registration: "${name}"`);
    }

    this.adapters.set(name, instance);
  }

  getEntries(): Array<[string, ServiceWithSchemaInterface]> {
    return Array.from(this.adapters.entries());
  }
}
