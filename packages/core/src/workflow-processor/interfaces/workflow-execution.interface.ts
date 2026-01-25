import { WorkflowEntity } from '@loopstack/common';
import { BlockExecutionContextDto } from '../../common';
import { ExecutionContext } from '../dtos/execution-context';
import { WorkflowState } from '../services/state/workflow.state';

export interface WorkflowExecution {
  readonly context: BlockExecutionContextDto;
  state: WorkflowState<any>;
  runtime: ExecutionContext;
  entity: WorkflowEntity;
}
