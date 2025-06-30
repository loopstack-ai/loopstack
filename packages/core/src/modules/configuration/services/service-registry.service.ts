import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  ServiceInterface,
  LOOP_SERVICE_DECORATOR,
  ServiceOptionsInterface,
} from '@loopstack/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SchemaRegistry } from './schema-registry.service';

@Injectable()
export class ServiceRegistry {
  private readonly logger = new Logger(ServiceRegistry.name);
  private services: Map<
    string,
    { options: ServiceOptionsInterface; instance: ServiceInterface }
  > = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly schemaRegistry: SchemaRegistry,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options: ServiceOptionsInterface = this.reflector.get(
        LOOP_SERVICE_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.logger.debug(`Register Service ${instance.constructor.name}`);
        this.registerService(options, instance);
      }
    }
  }

  getServiceByName(name: string): {
    options: ServiceOptionsInterface;
    instance: ServiceInterface;
  } {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found.`);
    }

    return service;
  }

  getServiceArgsSchema(options: ServiceOptionsInterface): any {
    if (!options.schema) {
      throw new Error('Service has no schema.');
    }

    const schema = zodToJsonSchema(options.schema, 'serviceSchema');
    return schema.definitions?.['serviceSchema'];
  }

  private registerService(
    options: ServiceOptionsInterface,
    instance: ServiceInterface,
  ) {
    const name = instance.constructor.name;

    if (this.services.has(name)) {
      throw new Error(`Duplicate service registration: "${name}"`);
    }

    this.services.set(name, { options, instance });

    if (options.schema) {
      if (options.JSONSchema) {
        this.schemaRegistry.addSchema('services.arguments', name, options.JSONSchema);
      } else {
        const jsonSchema  = zodToJsonSchema(options.schema as any, {
          name: 'schema',
          target: 'jsonSchema7',
        });
        // console.log(JSON.stringify(jsonSchema.definitions?.['schema'], null, 2))
        this.schemaRegistry.addSchema('services.arguments', name, jsonSchema.definitions?.['schema']);
      }
    }
  }

  getEntries(): Array<{
    options: ServiceOptionsInterface;
    instance: ServiceInterface;
  }> {
    return Array.from(this.services.values());
  }
}
