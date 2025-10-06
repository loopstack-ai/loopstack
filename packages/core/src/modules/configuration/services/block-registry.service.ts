import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  BLOCK_METADATA_KEY,
  BlockConfigSchema,
  BlockConfigType, BlockMetadata, BlockOptions, BlockType,
} from '@loopstack/shared';
import { ConfigLoaderService } from './config-loader.service';
import { omit } from 'lodash';

export interface BlockRegistryItem {
  target: any;
  provider: InstanceWrapper;
  metadata: BlockMetadata;
  configSource?: string;
  config: BlockConfigType;
}

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
    private readonly configLoaderService: ConfigLoaderService,
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  async onModuleInit() {
    await this.discoverBlocks();
  }

  /**
   * Discovers all @Block decorated classes and loads their configurations
   */
  private async discoverBlocks(): Promise<void> {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      const { instance, metatype } = provider;

      if (!metatype || !instance) {
        continue;
      }

      const options = this.reflector.get<BlockOptions>(
        BLOCK_METADATA_KEY,
        metatype,
      );

      if (options) {
        try {

          const baseConfig = options.config ?? {};
          if (options.configFile) {
            const configSource = this.configLoaderService.loadConfigFile(options.configFile);
            if (!configSource) {
              throw new Error(`Could not load config source ${options.configFile}`);
            }

            Object.assign(baseConfig, configSource.config);
          }

          const config: BlockConfigType = BlockConfigSchema
            .parse(baseConfig);

          const metadata = {
            ...omit(options, ['documentationFile']),  // do not include unnecessary overhead
            imports: options.imports?.map((item: any ) => item.name) ?? []
          } as BlockMetadata;

          const registeredBlock: BlockRegistryItem = {
            target: metatype,
            provider,
            metadata,
            configSource: options.configFile,
            config,
          };

          this.blocks.set(metatype.name, registeredBlock);

          this.logger.log(
            `Registered block: ${metatype.name} (type: ${metadata.config.type})`,
          );
        } catch (error) {
          this.logger.error(
            `Error registering block ${metatype.name}:`,
            error,
          );
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
  getBlocksByType(type: BlockType): BlockRegistryItem[] {
    return this.getBlocks().filter((block) => block.metadata.config.type === type);
  }

  /**
   * Gets a specific registered block by its class
   */
  getBlock(target: string): BlockRegistryItem | undefined {
    return this.blocks.get(target) as BlockRegistryItem;
  }
}