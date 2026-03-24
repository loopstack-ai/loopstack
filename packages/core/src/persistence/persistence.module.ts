import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  EventSubscriberEntity,
  NamespaceEntity,
  PipelineEntity,
  SecretEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import {
  DocumentService,
  EventSubscriberService,
  MigrationsService,
  NamespacesService,
  PipelineService,
  SecretService,
  WorkflowService,
  WorkspaceService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      NamespaceEntity,
      WorkspaceEntity,
      PipelineEntity,
      DocumentEntity,
      EventSubscriberEntity,
      SecretEntity,
    ]),
    CommonModule,
  ],
  providers: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
    DocumentService,
    MigrationsService,
    EventSubscriberService,
    SecretService,
  ],
  exports: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
    DocumentService,
    EventSubscriberService,
    SecretService,
  ],
})
export class PersistenceModule {}
