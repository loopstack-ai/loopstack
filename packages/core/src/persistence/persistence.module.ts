import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  EventSubscriberEntity,
  SecretEntity,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import {
  EventSubscriberService,
  SecretService,
  WorkflowCheckpointService,
  WorkflowService,
  WorkspaceService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      WorkspaceEntity,
      DocumentEntity,
      EventSubscriberEntity,
      SecretEntity,
      WorkflowCheckpointEntity,
    ]),
    CommonModule,
  ],
  providers: [WorkflowService, WorkspaceService, EventSubscriberService, SecretService, WorkflowCheckpointService],
  exports: [WorkflowService, WorkspaceService, EventSubscriberService, SecretService, WorkflowCheckpointService],
})
export class PersistenceModule {}
