import { ClientMessageDto, DocumentEntity } from '@loopstack/shared';
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { ClientMessageService } from '../../common/services/client-message.service';

@EventSubscriber()
export class DocumentSubscriber implements EntitySubscriberInterface<DocumentEntity> {

  constructor(
    dataSource: DataSource,
    private clientMessageService: ClientMessageService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return DocumentEntity;
  }

  afterInsert(event: InsertEvent<DocumentEntity>) {
    this.clientMessageService.dispatch(new ClientMessageDto({
      type: 'document.created',
      id: event.entity.id,
      userId: event.entity.createdBy,
      workflowId: event.entity.workflowId,
      data: event.entity,
    }));
  }
}