import type { TransitionPayloadInterface } from '@loopstack/contracts/types';
import { NamespaceEntity } from '../entities';

export class RunContext {
  root!: string;
  index!: string;
  userId!: string;
  pipelineId!: string;
  workspaceId!: string;
  workflowId?: string;
  namespace!: NamespaceEntity;
  labels!: string[];
  payload?: {
    transition?: TransitionPayloadInterface;
  };

  constructor(data: RunContext) {
    Object.assign(this, data);
  }
}
