import { ClientMessageDto, WorkflowEntity } from '@loopstack/shared';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { ClientMessageService } from '../../common/services/client-message.service';

@EventSubscriber()
export class WorkflowSubscriber
  implements EntitySubscriberInterface<WorkflowEntity>
{
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
    this.clientMessageService.dispatch(
      new ClientMessageDto({
        type: 'workflow.created',
        id: event.entity.id,
        userId: event.entity.createdBy,
        namespaceId: event.entity.namespaceId,
        projectId: event.entity.projectId,
        data: event.entity,
      }),
    );
  }

  afterUpdate(event: UpdateEvent<WorkflowEntity>): Promise<any> | void {
    this.clientMessageService.dispatch(
      new ClientMessageDto({
        type: 'workflow.updated',
        id: event.databaseEntity.id,
        userId: event.databaseEntity.createdBy,
        namespaceId: event.databaseEntity.namespaceId,
        projectId: event.databaseEntity.projectId,
        data: event.entity
          ? {
              ...event.databaseEntity,
              ...event.updatedColumns.reduce((acc, column) => {
                acc[column.propertyName] = column.getEntityValue(event.entity!);
                return acc;
              }, {}),
            }
          : event.databaseEntity,
      }),
    );
  }
}
