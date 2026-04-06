import { DocumentRepository } from './document-repository.interface';
import { ToolResult } from './handler.interface';

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface BlockInterface extends Object {}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  call(args: TArgs): Promise<ToolResult>;
}

export interface WorkflowInterface extends BlockInterface {
  readonly repository?: DocumentRepository;
}

export type WorkspaceInterface = BlockInterface;
