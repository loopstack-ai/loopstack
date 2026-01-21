import { BlockExecutionContextDto } from '../../common';
import { WorkflowState } from '../services/state/workflow.state';
import { ExecutionContext } from '../dtos/execution-context';
import { WorkflowEntity } from '@loopstack/common';

export interface WorkflowExecution {
  readonly context: BlockExecutionContextDto;
  state: WorkflowState<any>;
  runtime: ExecutionContext;
  entity: WorkflowEntity;
}