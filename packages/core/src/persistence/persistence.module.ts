import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import {
  DocumentService,
  MigrationsService,
  NamespacesService,
  PipelineService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { CommonModule } from '../common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      NamespaceEntity,
      WorkspaceEntity,
      PipelineEntity,
      DocumentEntity,
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
  ],
  exports: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
    DocumentService,
  ],
})
export class PersistenceModule {}
