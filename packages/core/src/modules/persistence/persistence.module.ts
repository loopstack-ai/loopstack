import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/shared';
import {
  DocumentService,
  NamespacesService,
  PipelineService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { WorkflowSubscriber } from './subscriber/workflow.subscriber';
import { CommonModule } from '../common';
import { DocumentSubscriber } from './subscriber/document.subscriber';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
  ],
  providers: [
    WorkflowService,
    PipelineService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
    WorkflowSubscriber,
    DocumentSubscriber,
  ],
  exports: [
    WorkflowService,
    PipelineService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
  ],
})
export class PersistenceModule {}
