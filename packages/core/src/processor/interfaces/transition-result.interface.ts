import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface TransitionResultInterface {
  workflow?: WorkflowEntity;
  nextPlace?: string | undefined;
}
