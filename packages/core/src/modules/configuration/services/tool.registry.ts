import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  ToolInterface,
  ServiceWithSchemaInterface,
  LOOP_TOOL_DECORATOR,
} from '@loopstack/shared';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools: Map<string, ToolInterface> = new Map();

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
        LOOP_TOOL_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.logger.debug(`Register ${instance.constructor.name}`);
        this.registerTool(instance);
      }
    }
  }

  getToolByName(name: string): ToolInterface | undefined {
    return this.tools.get(name);
  }

  private registerTool(instance: ToolInterface) {
    const name = instance.constructor.name;

    if (this.tools.has(name)) {
      throw new Error(`Duplicate tool registration: "${name}"`);
    }

    this.tools.set(name, instance);
  }

  getEntries(): Array<[string, ServiceWithSchemaInterface]> {
    return Array.from(this.tools.entries());
  }
}
