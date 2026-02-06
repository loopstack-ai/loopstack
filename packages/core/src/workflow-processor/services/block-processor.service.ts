import { Injectable } from '@nestjs/common';
import { BlockExecutionContextDto, WorkflowExecution, getBlockType } from '@loopstack/common';
import { ProcessorFactory } from './processor.factory';

@Injectable()
export class BlockProcessor {
  constructor(private readonly processorFactory: ProcessorFactory) {}

  async processBlock<TInstance extends object>(
    block: TInstance,
    args: any,
    ctx: BlockExecutionContextDto,
  ): Promise<WorkflowExecution> {
    const blockType = getBlockType(block);

    if (!blockType) {
      throw new Error(
        `Block ${block.constructor.name} does not have a block type decorator. ` +
          `Use @Workflow(), @Tool(), @Document(), or @Workspace().`,
      );
    }

    const processor = this.processorFactory.getProcessor(blockType);

    if (!processor) {
      throw new Error(`Processor for block type "${blockType}" is not defined.`);
    }

    return processor.process(block, args, ctx);
  }
}
