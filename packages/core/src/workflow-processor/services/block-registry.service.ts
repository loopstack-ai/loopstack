import { Abstract, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  BLOCK_METADATA_KEY,
  BlockConfigSchema,
  BlockConfigType,
  BlockMetadata,
  BlockOptions,
  getDecoratedProperties,
  INPUT_METADATA_KEY,
  OUTPUT_METADATA_KEY,
} from '@loopstack/shared';
import { omit } from 'lodash';
import {
  Tool,
  Workflow,
  Document,
  Workspace,
  Pipeline,
  Factory,
} from '../abstract';
import { ConfigLoaderService } from './config-loader.service';

export interface BlockRegistryItem {
  name: string;
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

  private getBlockType(
    instance: Workflow | Tool | Document | Workspace | Pipeline | Factory,
  ): string | undefined {
    switch (true) {
      case instance instanceof Workflow:
        return 'workflow';
      case instance instanceof Tool:
        return 'tool';
      case instance instanceof Document:
        return 'document';
      case instance instanceof Factory:
        return 'factory';
      case instance instanceof Pipeline:
        return 'sequence';
      case instance instanceof Workspace:
        return 'workspace';
    }

    return undefined;
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
            const configSource = this.configLoaderService.loadConfigFile(
              options.configFile,
            );
            if (!configSource) {
              throw new Error(
                `Could not load config source ${options.configFile}`,
              );
            }

            Object.assign(baseConfig, configSource.config);
          }

          // override type from provider property
          baseConfig.type = this.getBlockType(provider.instance) as any;

          const config: BlockConfigType = BlockConfigSchema.parse(baseConfig);

          const inputs = getDecoratedProperties(metatype, INPUT_METADATA_KEY);
          const outputs = getDecoratedProperties(metatype, OUTPUT_METADATA_KEY);

          const metadata = {
            ...omit(options, ['documentationFile']), // do not include unnecessary overhead
            imports: options.imports ?? [],
            inputProperties: inputs,
            outputProperties: outputs,
          } as BlockMetadata;

          const registeredBlock: BlockRegistryItem = {
            name: metatype.name,
            provider,
            metadata,
            configSource: options.configFile,
            config,
          };

          this.blocks.set(registeredBlock.name, registeredBlock);

          this.logger.log(`Registered block: ${registeredBlock.name}`);
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
    return this.getBlocks().filter(
      (block) => block.provider.instance instanceof type,
    );
  }

  /**
   * Gets a specific registered block by its class
   */
  getBlock(target: string): BlockRegistryItem | undefined {
    return this.blocks.get(target) as BlockRegistryItem;
  }
}
