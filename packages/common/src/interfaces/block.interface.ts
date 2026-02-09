import { RunContext } from '../dtos';
import { ToolResult } from './handler.interface';
import { WorkflowMetadataInterface } from './workflow-metadata.interface';

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface BlockInterface extends Object {
  validate?<TArgs>(args: unknown): TArgs;
}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  execute(
    args: TArgs,
    context: RunContext,
    parentBlock: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult>;
}

export interface WorkflowInterface extends BlockInterface {
  getResult?(ctx: any, args: any): any;
}

export interface DocumentInterface extends BlockInterface {
  content: any;
}

export type WorkspaceInterface = BlockInterface;
