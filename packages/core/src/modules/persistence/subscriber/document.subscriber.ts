import { ClientMessageDto, DocumentEntity } from '@loopstack/shared';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
// import { ClientMessageService } from '../../common/services/client-message.service';
import { ConfigService } from '@nestjs/config';

@EventSubscriber()
export class DocumentSubscriber
  implements EntitySubscriberInterface<DocumentEntity>
{
  clientId: string;

  constructor(
    dataSource: DataSource,
    // private clientMessageService: ClientMessageService,
    private configService: ConfigService,
  ) {
    dataSource.subscribers.push(this);
    this.clientId = configService.get<string>('auth.clientId')!;
  }

  listenTo() {
    return DocumentEntity;
  }

  afterInsert(event: InsertEvent<DocumentEntity>) {
    // this.clientMessageService.dispatch(
    //   new ClientMessageDto({
    //     type: 'document.created',
    //     id: event.entity.id,
    //     userId: event.entity.createdBy,
    //     workflowId: event.entity.workflowId,
    //     workerId: this.clientId,
    //     data: event.entity,
    //   }),
    // );
  }
}
