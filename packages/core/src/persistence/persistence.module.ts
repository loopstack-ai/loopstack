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
  DynamicRepositoryService,
  NamespacesService,
  PipelineService,
  WorkflowService,
  WorkspaceService,
} from './services';
import { WorkflowSubscriber } from './subscriber/workflow.subscriber';
import { DocumentSubscriber } from './subscriber/document.subscriber';
import { DataSource } from 'typeorm';
import { CommonModule } from '../common';

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
    {
      provide: DynamicRepositoryService,
      useFactory: (dataSource) => {
        return new DynamicRepositoryService(dataSource, {
          blacklist: [],
        });
      },
      inject: [DataSource],
    },
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
