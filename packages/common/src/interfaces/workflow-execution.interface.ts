import { RunContext } from '../dtos/index.js';
import { WorkflowEntity } from '../entities/index.js';

export interface WorkflowExecution {
  readonly context: RunContext;
  state: any;
  entity: WorkflowEntity;
}
