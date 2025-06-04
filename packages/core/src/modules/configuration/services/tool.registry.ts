import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  ToolInterface,
  LOOP_TOOL_DECORATOR,
  ToolOptionsInterface,
} from '@loopstack/shared';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools: Map<string, { options: ToolOptionsInterface; instance: ToolInterface }> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  initialize() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const instance = provider.instance;
      if (!instance || !instance.constructor) continue;

      const options: ToolOptionsInterface = this.reflector.get(
        LOOP_TOOL_DECORATOR,
        instance.constructor,
      );

      if (options) {
        this.logger.debug(`Register Tool ${instance.constructor.name} as ${options.name}`);
        this.registerTool(options, instance);
      }
    }
  }

  getToolByName(name: string): { options: ToolOptionsInterface; instance: ToolInterface } {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found.`);
    }

    return tool;
  }

  private registerTool(options: ToolOptionsInterface, instance: ToolInterface) {
    if (this.tools.has(options.name)) {
      throw new Error(`Duplicate tool registration: "${options.name}"`);
    }

    this.tools.set(options.name, { options, instance });
  }

  getEntries(): Array<{ options: ToolOptionsInterface; instance: ToolInterface }> {
    return Array.from(this.tools.values());
  }
}
