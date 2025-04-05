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

@Module({
  imports: [
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
