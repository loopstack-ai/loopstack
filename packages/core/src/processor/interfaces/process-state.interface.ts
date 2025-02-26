import { ContextInterface } from './context.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface ProcessStateInterface {
  context: ContextInterface;
  workflow: WorkflowEntity | undefined;
}
