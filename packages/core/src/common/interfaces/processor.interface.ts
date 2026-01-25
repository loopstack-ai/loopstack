import { WorkflowExecution } from '../../workflow-processor/interfaces/workflow-execution.interface';

export interface Processor {
  process(block: any, args: any, ctx: any): Promise<WorkflowExecution>;
}
