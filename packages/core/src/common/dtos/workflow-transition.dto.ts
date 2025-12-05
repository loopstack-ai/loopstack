import type { TransitionMetadataInterface } from '@loopstack/contracts/types';
import { Expose } from 'class-transformer';

export class WorkflowTransitionDto implements TransitionMetadataInterface {
  @Expose()
  id!: string;

  @Expose()
  from!: string;

  @Expose()
  to!: string | string[];

  @Expose()
  onError?: string;

  @Expose()
  payload?: any;

  constructor(data: Partial<WorkflowTransitionDto>) {
    Object.assign(this, data);
  }
}
