import { ToolEnvelope } from './handler.interface.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockInterface {}

export interface ToolInterface<TArgs extends object = any> extends BlockInterface {
  call(args: TArgs): Promise<ToolEnvelope>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WorkflowInterface extends BlockInterface {}
