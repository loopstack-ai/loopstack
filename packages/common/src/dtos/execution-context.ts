import { WorkflowTransitionType } from '@loopstack/contracts/types';
import { WorkflowTransitionDto } from './workflow-transition.dto';

export class ExecutionContext {
  error!: boolean;
  stop!: boolean;
  transition?: WorkflowTransitionDto;
  availableTransitions!: WorkflowTransitionType[];
  persistenceState!: {
    documentsUpdated: boolean;
  };
  nextPlace?: string;

  constructor(data: Partial<ExecutionContext>) {
    Object.assign(this, data);
  }
}
