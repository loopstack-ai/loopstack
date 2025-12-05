import { Injectable, Logger } from '@nestjs/common';
import { ProcessorFactory } from '../processor.factory';
import { Tool } from '../../abstract';
import { Processor } from '../../../common';

@Injectable()
export class ToolProcessorService implements Processor {
  private readonly logger = new Logger(ToolProcessorService.name);

  async process(block: Tool, factory: ProcessorFactory): Promise<Tool> {
    block.result = await block.execute(block.args, block.ctx, factory);
    return block;
  }
}
