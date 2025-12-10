import { Injectable, Logger, Type } from '@nestjs/common';
import { ToolResult } from '@loopstack/common';
import {
  BlockProcessor,
} from '../../../workflow-processor';

@Injectable()
export class DelegateService {
  protected readonly logger = new Logger(DelegateService.name);

  constructor(
    private readonly blockProcessor: BlockProcessor,
  ) {}

  private validateToolAvailable(
    toolName: string,
    availableImports: (Type | string)[],
  ) {
    if (
      !availableImports.some((item) =>
        typeof item === 'string' ? item === toolName : item.name === toolName,
      )
    ) {
      throw new Error(
        `Tool ${toolName} is not available. Make sure to import required tools to the parent block.`,
      );
    }
  }

  async delegate(
    toolName: string,
    args: any,
    ctx: any,
    availableImports: (Type | string)[],
  ): Promise<ToolResult> {
    // this.validateToolAvailable(toolName, availableImports);
    //
    // const toolBlock = await this.blockFactory.resolveEntrypoint<
    //   Tool
    // >(toolName);
    //
    // const tool = await this.blockProcessor.processBlock<Tool>(
    //   toolBlock,
    //   args,
    //   ctx,
    //   factory
    // );

    return {};
  }
}
