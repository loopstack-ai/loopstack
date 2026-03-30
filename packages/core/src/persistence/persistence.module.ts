import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  EventSubscriberEntity,
  PipelineEntity,
  SecretEntity,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import {
  DocumentService,
  EventSubscriberService,
  PipelineService,
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
      PipelineEntity,
      DocumentEntity,
      EventSubscriberEntity,
      SecretEntity,
      WorkflowCheckpointEntity,
    ]),
    CommonModule,
  ],
  providers: [
    WorkflowService,
    WorkspaceService,
    PipelineService,
    DocumentService,
    EventSubscriberService,
    SecretService,
    WorkflowCheckpointService,
  ],
  exports: [
    WorkflowService,
    WorkspaceService,
    PipelineService,
    DocumentService,
    EventSubscriberService,
    SecretService,
    WorkflowCheckpointService,
  ],
})
export class PersistenceModule {}
