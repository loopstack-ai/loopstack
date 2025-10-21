import { Injectable } from '@nestjs/common';
import { ProcessorFactory } from './processor.factory';
import { BlockInterface } from '../interfaces/block.interface';

@Injectable()
export class BlockProcessor {
  async processBlock<TInstance extends BlockInterface>(
    block: TInstance,
    factory: ProcessorFactory,
  ): Promise<TInstance> {
    const processorName = block.processor;
    const processor = factory.getProcessor(processorName);
    if (!processor) {
      throw new Error(`Processor ${processorName} is not defined.`);
    }

    return processor.process(block, factory);
  }
}
