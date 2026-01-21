import { ToolResult } from '@loopstack/common';
import { WorkflowExecution } from '../interfaces';
import { Block } from './block.abstract';

export abstract class ToolBase<TArgs extends object = any> extends Block {
  public type: string = 'tool';

  public abstract execute(
    args: TArgs,
    ctx: WorkflowExecution,
    parentBlock?: Block,
  ): Promise<ToolResult>;
}
