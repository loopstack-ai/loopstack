import { RunContext } from '../dtos';
import { WorkflowEntity } from '../entities';

export interface WorkflowExecution {
  readonly context: RunContext;
  state: any;
  entity: WorkflowEntity;
}
