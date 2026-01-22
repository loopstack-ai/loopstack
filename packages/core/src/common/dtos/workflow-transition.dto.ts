import { Expose } from 'class-transformer';
import type { TransitionMetadataInterface } from '@loopstack/contracts/types';

export class WorkflowTransitionDto implements TransitionMetadataInterface {
  @Expose()
  id!: string;

  @Expose()
  from!: string;

  @Expose()
  to!: string;

  @Expose()
  onError?: string;

  @Expose()
  payload?: unknown;

  constructor(data: Partial<WorkflowTransitionDto>) {
    Object.assign(this, data);
  }
}
