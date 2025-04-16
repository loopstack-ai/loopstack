import { ClientMessageDto, WorkflowEntity } from '@loopstack/shared';
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { ClientMessageService } from '../../common/services/client-message.service';

@EventSubscriber()
export class WorkflowSubscriber implements EntitySubscriberInterface<WorkflowEntity> {

  constructor(
    dataSource: DataSource,
    private clientMessageService: ClientMessageService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return WorkflowEntity;
  }

  afterInsert(event: InsertEvent<WorkflowEntity>) {
    this.clientMessageService.dispatch(new ClientMessageDto({
      data: event.entity,
      type: 'workflow-created',
      userId: event.entity.createdBy,
      workspaceId: 'todo',
      projectId: 'todo',
    }));
  }
}