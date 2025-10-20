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
  DynamicRepositoryService,
  NamespacesService,
  PipelineService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { WorkflowSubscriber } from './subscriber/workflow.subscriber';
// import { CommonModule } from '../common';
import { DocumentSubscriber } from './subscriber/document.subscriber';
import { DataSource } from 'typeorm';
// import { CreateEntityHandler } from './handlers/create-entity.handler';
// import { SqlQueryHandler } from './handlers/sql-query.handler';

@Module({
  imports: [
    // CommonModule,
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
    {
      provide: DynamicRepositoryService,
      useFactory: (dataSource) => {
        return new DynamicRepositoryService(dataSource, {
          blacklist: [],
        });
      },
      inject: [DataSource],
    },

    // CreateEntityHandler,
    // SqlQueryHandler,
  ],
  exports: [
    WorkflowService,
    PipelineService,
    WorkspaceService,
    DocumentService,
    NamespacesService,
    DynamicRepositoryService,
  ],
})
export class PersistenceModule {}
