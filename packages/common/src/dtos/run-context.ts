import { RunPayload } from '@loopstack/contracts/schemas';
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
  payload?: RunPayload;

  constructor(data: RunContext) {
    Object.assign(this, data);
  }
}
