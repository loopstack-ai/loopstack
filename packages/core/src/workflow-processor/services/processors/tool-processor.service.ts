import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Tool } from '../../abstract';

@Injectable()
export class ToolProcessorService implements Processor {
  private readonly logger = new Logger(ToolProcessorService.name);

  async process(block: Tool, factory: ProcessorFactory): Promise<Tool> {
    block.result = await block.execute();
    return block;
  }
}
