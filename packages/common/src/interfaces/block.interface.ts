import { DocumentRepository } from './document-repository.interface.js';
import { ToolResult } from './handler.interface.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockInterface {}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  call(args: TArgs): Promise<ToolResult>;
}

export interface WorkflowInterface extends BlockInterface {
  readonly repository?: DocumentRepository;
}

export type AppInterface = BlockInterface;
