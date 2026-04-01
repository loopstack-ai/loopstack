import { ToolResult } from './handler.interface';

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface BlockInterface extends Object {}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  run(args: TArgs): Promise<ToolResult>;
}

export interface WorkflowInterface extends BlockInterface {
  getResult?(): unknown;
}

export interface DocumentInterface extends BlockInterface {
  content: unknown;
}

export type WorkspaceInterface = BlockInterface;
