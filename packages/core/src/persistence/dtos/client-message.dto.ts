import type { ClientMessageInterface } from '@loopstack/contracts/types';

export class ClientMessageDto implements ClientMessageInterface {
  userId!: string | null;
  workerId!: string;
  id?: string;
  namespaceId?: string;
  workflowId?: string;
  pipelineId?: string;
  workspaceId?: string;
  type!: string;

  constructor(payload: ClientMessageInterface) {
    Object.assign(this, payload);
  }
}
