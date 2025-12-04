import { Injectable, Logger } from '@nestjs/common';
import {
  BlockFactory,
  BlockProcessor,
  ProcessorFactory,
  Tool,
  ToolExecutionContextDto,
} from '../../workflow-processor';
import { HandlerCallResult } from '@loopstack/common';

@Injectable()
export class DelegateService {
  protected readonly logger = new Logger(DelegateService.name);

  constructor(
    private readonly blockProcessor: BlockProcessor,
    private readonly blockFactory: BlockFactory,
  ) {}

  async delegate(toolName: string, args: any, ctx: any, factory: ProcessorFactory): Promise<HandlerCallResult> {
    const toolBlock = await this.blockFactory.createBlock<
      Tool,
      ToolExecutionContextDto
    >(
      toolName,
      args,
      ctx,
    );

    const tool = await this.blockProcessor.processBlock<Tool>(
      toolBlock,
      factory,
    );

    return tool.result;
  }
}
