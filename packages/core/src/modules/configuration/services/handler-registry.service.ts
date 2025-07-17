import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  HandlerInterface,
  HandlerOptionsInterface,
  LOOP_HANDLER_DECORATOR,
} from '@loopstack/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';

@Injectable()
export class HandlerRegistry {
  private readonly logger = new Logger(HandlerRegistry.name);
  private handlers: Map<
    string,
    { options: HandlerOptionsInterface; instance: HandlerInterface }
  > = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options: HandlerOptionsInterface = this.reflector.get(
        LOOP_HANDLER_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.logger.debug(`Register Tool Handler ${instance.constructor.name}`);
        this.registerHandler(options, instance);
      }
    }
  }

  getHandlerByName(name: string): {
    options: HandlerOptionsInterface;
    instance: HandlerInterface;
  } {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Handler ${name} not found.`);
    }

    return handler;
  }

  getHandlerArgsSchema(options: HandlerOptionsInterface): any {
    if (!options.schema) {
      throw new Error('Handler has no schema.');
    }

    const schema = zodToJsonSchema(options.schema, 'handlerSchema');
    return schema.definitions?.['handlerSchema'];
  }

  private registerHandler(
    options: HandlerOptionsInterface,
    instance: HandlerInterface,
  ) {
    const name = instance.constructor.name;

    if (this.handlers.has(name)) {
      throw new Error(`Duplicate handler registration: "${name}"`);
    }

    this.handlers.set(name, { options, instance });
  }

  getEntries(): Array<{
    options: HandlerOptionsInterface;
    instance: HandlerInterface;
  }> {
    return Array.from(this.handlers.values());
  }
}
