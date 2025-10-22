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

  async process(
    block: Workspace,
    factory: ProcessorFactory,
  ): Promise<Workspace> {
    const childBlock = await this.blockFactory.createBlock<
      BlockInterface,
      BlockContextType
    >(block.ctx.root, block.args, block.ctx);

    await this.blockProcessor.processBlock<BlockInterface>(childBlock, factory);
    return block;
  }
}
