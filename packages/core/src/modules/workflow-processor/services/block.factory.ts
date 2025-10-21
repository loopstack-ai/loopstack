import { Injectable, Logger } from '@nestjs/common';
import { BlockRegistryService } from './block-registry.service';
import { CapabilityBuilder } from './capability-builder.service';
import { BlockInterface } from '../interfaces/block.interface';

@Injectable()
export class BlockFactory {
  private readonly logger = new Logger(BlockFactory.name);

  constructor(
    private readonly blockRegistryService: BlockRegistryService,
    private readonly capabilityBuilder: CapabilityBuilder,
  ) {}

  async createBlock<T extends BlockInterface, TContext>(
    blockName: string,
    args: any,
    ctx: TContext,
  ): Promise<T> {
    this.logger.debug(`Processing item: "${blockName}"`);

    const blockRegistryItem = this.blockRegistryService.getBlock(blockName);
    if (!blockRegistryItem) {
      throw new Error(`Block with name "${blockName}" not found.`)
    }

    const parsedArgs = blockRegistryItem.metadata.properties?.parse(args ?? {});

    const service = await this.capabilityBuilder.getCapability<T>(blockRegistryItem.name, blockRegistryItem.config);
    service.init(blockRegistryItem, parsedArgs, ctx)

    return service;
  }
}