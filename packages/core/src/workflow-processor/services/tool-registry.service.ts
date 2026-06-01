import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { BLOCK_TYPE_METADATA_KEY, BaseTool, getBlockName } from '@loopstack/common';
import type { ToolRegistry } from '@loopstack/common';

/**
 * Registry of all @Tool() singletons, built at bootstrap via NestJS DiscoveryService.
 *
 * Indexes tools by their @Tool({ name }) value (or class name as fallback).
 * Used by LLM tools to resolve string tool names to BaseTool instances.
 */
@Injectable()
export class ToolRegistryService implements ToolRegistry, OnApplicationBootstrap {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly byName = new Map<string, BaseTool>();

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      if (!wrapper.metatype || !wrapper.instance) continue;

      const blockType = Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, wrapper.metatype);
      if (blockType !== 'tool') continue;

      const instance = wrapper.instance as BaseTool;
      const name = getBlockName(instance);

      if (this.byName.has(name)) {
        this.logger.warn(
          `Duplicate tool name "${name}" — ${wrapper.metatype.name} conflicts with existing registration. Last registration wins.`,
        );
      }

      this.byName.set(name, instance);
    }

    this.logger.log(`Registered ${this.byName.size} tool(s): ${[...this.byName.keys()].join(', ')}`);
  }

  get(name: string): BaseTool {
    const tool = this.byName.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not registered. Available: ${[...this.byName.keys()].join(', ') || 'none'}`);
    }
    return tool;
  }

  getMany(names: string[]): BaseTool[] {
    return names.map((name) => this.get(name));
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  getAll(): BaseTool[] {
    return [...this.byName.values()];
  }
}
