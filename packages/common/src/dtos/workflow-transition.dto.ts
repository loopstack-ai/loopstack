import type { TransitionMetadataInterface } from '@loopstack/contracts/types';

export class WorkflowTransitionDto implements TransitionMetadataInterface {
  id!: string;
  from!: string;
  to!: string;
  onError?: string;
  payload?: unknown;

  constructor(data: Partial<WorkflowTransitionDto>) {
    Object.assign(this, data);
  }
}
