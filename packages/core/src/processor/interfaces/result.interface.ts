import { ContextInterface } from './context.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface ResultInterface {
  context: ContextInterface;
  lastState?: WorkflowEntity;
}
