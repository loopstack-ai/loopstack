import { ContextInterface } from './context.interface';
import { WorkflowEntity } from '../../persistence/entities';
import { WorkflowData } from './workflow-data.interface';

export interface ProcessStateInterface {
  context: ContextInterface;
  data: WorkflowData | undefined;
  workflow: WorkflowEntity | undefined;
}
