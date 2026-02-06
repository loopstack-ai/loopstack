import { ToolResult } from './handler.interface';

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface BlockInterface extends Object {
  validate?<TArgs>(args: unknown): TArgs;
}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  execute(args: TArgs, ctx: any, parentBlock?: WorkflowInterface | ToolInterface): Promise<ToolResult>;
}

export interface WorkflowInterface extends BlockInterface {
  getResult?(ctx: any, args: any): any;
}

export type DocumentInterface = BlockInterface;

export type WorkspaceInterface = BlockInterface;
