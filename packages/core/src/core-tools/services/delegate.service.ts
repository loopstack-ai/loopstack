import { Injectable, Logger, Type } from '@nestjs/common';
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

  private validateToolAvailable(toolName: string, availableImports: (Type | string)[]) {
    if (!availableImports.some((item) =>
      typeof item === 'string' ? item === toolName : item.name === toolName
    )) {
      throw new Error(`Tool ${toolName} is not available. Make sure to import required tools to the parent block.`)
    }
  }

  async delegate(toolName: string, args: any, ctx: any, factory: ProcessorFactory, availableImports: (Type | string)[]): Promise<HandlerCallResult> {

    this.validateToolAvailable(toolName, availableImports);

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
