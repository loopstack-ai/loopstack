import { Abstract, Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodType } from 'zod/v3';
import { BLOCK_METADATA_KEY, BlockOptions } from '@loopstack/common';
import { BlockRegistryItem } from '../../common';

/**
 * Block Registry Service
 *
 * Discovers all classes decorated with @Block and loads their configuration files.
 */
@Injectable()
export class BlockRegistryService implements OnModuleInit {
  private logger = new Logger(BlockRegistryService.name);
  private readonly blocks = new Map<string, BlockRegistryItem>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.discoverBlocks();
  }

  /**
   * Discovers all @Block decorated classes and loads their configurations
   */
  private discoverBlocks() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const { instance, metatype } = provider as {
        instance: { name: string } | null;
        metatype: Type | null;
      };

      if (!metatype || !instance) {
        continue;
      }

      const options = this.reflector.get<BlockOptions>(BLOCK_METADATA_KEY, metatype);

      if (options) {
        try {
          this.blocks.set(instance.name, {
            name: instance.name,
            provider,
          });

          this.logger.log(`Registered block: ${instance.name}`);
        } catch (error) {
          this.logger.error(`Error registering block ${metatype.name}:`, error);
        }
      }
    }

    this.logger.log(`Total blocks registered: ${this.blocks.size}`);
  }

  /**
   * Gets all registered blocks
   */
  getBlocks(): BlockRegistryItem[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Gets blocks by type
   */
  getBlocksByType(type: Abstract<any>): BlockRegistryItem[] {
    return this.getBlocks().filter((block) => block.provider.instance instanceof type);
  }

  /**
   * Gets a specific registered block by its class
   */
  getBlock(target: string): BlockRegistryItem | undefined {
    return this.blocks.get(target) as BlockRegistryItem;
  }

  zodToJsonSchema(properties: any): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const jsonSchema = zodToJsonSchema(properties, {
      name: 'propertiesSchema',
      target: 'jsonSchema7',
    });

    return jsonSchema?.definitions?.propertiesSchema;
  }
}
