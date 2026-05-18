import { ToolResult } from './handler.interface.js';

export type StepResultLookup = Record<string, any>;

export type ToolResultLookup = Record<string, ToolResult>;

export type TransitionResultLookup = Record<
  string,
  {
    toolResults: ToolResultLookup;
  }
>;
