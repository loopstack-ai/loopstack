import { HandlerCallResult } from './handler.interface';

export type StepResultLookup = Record<string, any>;

export type ToolResultLookup = Record<string, HandlerCallResult>;

export type TransitionResultLookup = Record<string, {
  toolResults: ToolResultLookup
}>;