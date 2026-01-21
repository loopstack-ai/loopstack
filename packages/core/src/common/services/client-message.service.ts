import { Injectable } from '@nestjs/common';
import { ClientMessageInterface } from '@loopstack/contracts/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ClientMessageDto } from '../dtos/client-message.dto';
import { DocumentEntity, WorkflowEntity } from '@loopstack/common';

@Injectable()
export class ClientMessageService {
  clientId: string;

  constructor(
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    this.clientId = configService.get<string>('auth.clientId')!;
  }

  dispatch(message: ClientMessageInterface) {
    this.eventEmitter.emit('client.message', message);
  }

  dispatchWorkflowEvent(type: string, entity: WorkflowEntity) {
    this.eventEmitter.emit(
      'client.message',
      new ClientMessageDto({
        type: type,
        id: entity.id,
        userId: entity.createdBy,
        namespaceId: entity.namespaceId,
        pipelineId: entity.pipelineId,
        workerId: this.clientId,
      }),
    );
  }

  dispatchDocumentEvent(type: string, entity: WorkflowEntity) {
    this.eventEmitter.emit(
      'client.message',
      new ClientMessageDto({
        type: type,
        userId: entity.createdBy,
        workflowId: entity.id,
        workerId: this.clientId,
      }),
    );
  }
}
