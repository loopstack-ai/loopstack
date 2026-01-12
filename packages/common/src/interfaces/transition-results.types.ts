import { ToolResult } from './handler.interface';

export type StepResultLookup = Record<string, any>;

export type ToolResultLookup = Record<string, ToolResult>;

export type TransitionResultLookup = Record<
  string,
  {
    toolResults: ToolResultLookup;
  }
>;
