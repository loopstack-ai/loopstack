import { ContextInterface } from './context.interface';
import { WorkflowEntity } from '../../persistence/entities';

export interface ProcessStateInterface {
  context: ContextInterface;
  workflow: WorkflowEntity | undefined;
}
