import { ClientMessageDto, WorkflowEntity } from '@loopstack/shared';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
// import { ClientMessageService } from '../../common/services/client-message.service';
import { ConfigService } from '@nestjs/config';

@EventSubscriber()
export class WorkflowSubscriber
  implements EntitySubscriberInterface<WorkflowEntity>
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
    return WorkflowEntity;
  }

  afterInsert(event: InsertEvent<WorkflowEntity>) {
    // this.clientMessageService.dispatch(
    //   new ClientMessageDto({
    //     type: 'workflow.created',
    //     id: event.entity.id,
    //     userId: event.entity.createdBy,
    //     namespaceId: event.entity.namespaceId,
    //     pipelineId: event.entity.pipelineId,
    //     workerId: this.clientId,
    //     data: event.entity,
    //   }),
    // );
  }

  afterUpdate(event: UpdateEvent<WorkflowEntity>): Promise<any> | void {
    // this.clientMessageService.dispatch(
    //   new ClientMessageDto({
    //     type: 'workflow.updated',
    //     id: event.databaseEntity.id,
    //     userId: event.databaseEntity.createdBy,
    //     namespaceId: event.databaseEntity.namespaceId,
    //     pipelineId: event.databaseEntity.pipelineId,
    //     workerId: this.clientId,
    //     data: event.entity
    //       ? {
    //           ...event.databaseEntity,
    //           ...event.updatedColumns.reduce((acc, column) => {
    //             acc[column.propertyName] = column.getEntityValue(event.entity!);
    //             return acc;
    //           }, {}),
    //         }
    //       : event.databaseEntity,
    //   }),
    // );
  }
}
