import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  EventSubscriberEntity,
  NamespaceEntity,
  PipelineEntity,
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
  ],
  exports: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
    DocumentService,
    EventSubscriberService,
  ],
})
export class PersistenceModule {}
