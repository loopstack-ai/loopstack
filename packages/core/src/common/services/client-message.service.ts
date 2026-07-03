import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEntity } from '@loopstack/common';
import { ClientMessage, ClientMessageSchema } from '@loopstack/contracts/events';

@Injectable()
export class ClientMessageService {
  clientId: string;

  constructor(
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    this.clientId = configService.get<string>('auth.clientId')!;
  }

  dispatch(message: ClientMessage) {
    if (process.env.NODE_ENV !== 'production') {
      ClientMessageSchema.parse(message);
    }
    this.eventEmitter.emit('client.message', message);
  }

  dispatchWorkflowCreated(entity: WorkflowEntity) {
    this.dispatch({
      type: 'workflow.created',
      id: entity.id,
      workflowId: entity.id,
      parentId: entity.parentId ?? undefined,
      userId: entity.createdBy,
      workerId: this.clientId,
    });
  }

  dispatchWorkflowUpdated(entity: WorkflowEntity) {
    this.dispatch({
      type: 'workflow.updated',
      id: entity.id,
      workflowId: entity.id,
      parentId: entity.parentId ?? undefined,
      status: entity.status,
      userId: entity.createdBy,
      workerId: this.clientId,
    });
  }

  dispatchDocumentCreated(entity: WorkflowEntity) {
    this.dispatch({
      type: 'document.created',
      workflowId: entity.id,
      userId: entity.createdBy,
      workerId: this.clientId,
    });
  }

  dispatchWorkspaceEvent(
    type: 'secret.upserted' | 'secret.deleted' | 'git.updated',
    workspaceId: string,
    userId: string,
  ) {
    this.dispatch({
      type,
      workspaceId,
      userId,
      workerId: this.clientId,
    });
  }
}
