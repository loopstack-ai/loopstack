import { WorkflowExecution } from '@loopstack/common';

export interface Processor {
  process(block: any, args: any, ctx: any): Promise<WorkflowExecution>;
}
