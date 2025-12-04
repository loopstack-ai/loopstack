import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Workspace } from '../../abstract';
import { BlockFactory } from '../block.factory';
import { BlockProcessor } from '../block-processor.service';
import {
  BlockContextType,
  BlockInterface,
} from '../../interfaces/block.interface';

@Injectable()
export class WorkspaceProcessorService implements Processor {
  private readonly logger = new Logger(WorkspaceProcessorService.name);

  constructor(
    private readonly blockFactory: BlockFactory,
    private readonly blockProcessor: BlockProcessor,
  ) {}

  private validateAvailable(name: string, parentBlock: BlockInterface) {
    if (!parentBlock.metadata.imports.some((item) => item.name === name)) {
      throw new Error(`Block ${name} is not available. Make sure to import required blocks to the parent.`)
    }
  }

  async process(
    block: Workspace,
    factory: ProcessorFactory,
  ): Promise<Workspace> {
    this.validateAvailable(block.ctx.root, block);

    const childBlock = await this.blockFactory.createBlock<
      BlockInterface,
      BlockContextType
    >(block.ctx.root, block.args, block.ctx);

    await this.blockProcessor.processBlock<BlockInterface>(childBlock, factory);
    return block;
  }
}
