import { Injectable } from '@nestjs/common';
import { BlockExecutionContextDto, BlockInterface } from '../../common';
import { WorkflowExecution } from '../interfaces/workflow-execution.interface';
import { ProcessorFactory } from './processor.factory';

@Injectable()
export class BlockProcessor {
  constructor(private readonly processorFactory: ProcessorFactory) {}
  async processBlock<TInstance extends BlockInterface>(
    block: TInstance,
    args: any,
    ctx: BlockExecutionContextDto,
  ): Promise<WorkflowExecution> {
    const processorName = block.type;
    const processor = this.processorFactory.getProcessor(processorName);
    if (!processor) {
      throw new Error(`Processor ${processorName} is not defined.`);
    }

    return processor.process(block, args, ctx);
  }
}
