import { z } from 'zod';
import { BlockExecutionContextDto, ExecutionContext } from '../dtos';
import { WorkflowEntity } from '../entities';
import { WorkflowStateInterface } from './workflow-state.interface';

export interface WorkflowExecution<TData extends z.ZodType = z.ZodObject> {
  readonly context: BlockExecutionContextDto;
  state: WorkflowStateInterface<TData>;
  runtime: ExecutionContext;
  entity: WorkflowEntity;
}
