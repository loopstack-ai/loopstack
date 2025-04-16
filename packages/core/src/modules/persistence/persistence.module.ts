import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  NamespaceEntity,
  ProjectEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/shared';
import {
  DocumentService,
  NamespacesService,
  ProjectService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { WorkflowSubscriber } from './subscriber/workflow.subscriber';
import { CommonModule } from '../common';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
  ],
  providers: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
    WorkflowSubscriber,
  ],
  exports: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
  ],
})
export class PersistenceModule {}
