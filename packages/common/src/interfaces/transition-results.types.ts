import { ToolEnvelope } from './handler.interface.js';

export type StepResultLookup = Record<string, any>;

export type ToolResultLookup = Record<string, ToolEnvelope>;

export type TransitionResultLookup = Record<
  string,
  {
    toolResults: ToolResultLookup;
  }
>;
