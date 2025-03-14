import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { z, ZodType } from 'zod';
import { AdapterInterface } from '../../processor/interfaces/adapter.interface';
import { LOOP_ADAPTER_DECORATOR } from '../../processor';
import { AdapterConfigDefaultSchema } from '../schemas/adapter.schema';

@Injectable()
export class AdapterRegistry {
  private adapters: Map<string, AdapterInterface> = new Map<
    string,
    AdapterInterface
  >([]);

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
        console.log(instance.constructor.name)
        this.adapters.set(instance.constructor.name, instance);
      }
    }
  }

  getAdapterByName(name: string): AdapterInterface | undefined {
    return this.adapters.get(name);
  }

  getAdapterSchemas(): ZodType[] {
    const schemas: ZodType[] = [];
    for (const [name, adapter] of this.adapters.entries()) {

      if (adapter.propsSchema) {
        const adapterSchema = AdapterConfigDefaultSchema.extend({
          adapter: z.literal(name),
          props: adapter.propsSchema,
        });

        schemas.push(adapterSchema);
      }
    }

    return schemas;
  }
}
