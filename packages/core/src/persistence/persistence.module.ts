import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import {
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
    ]),
    CommonModule,
  ],
  providers: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
  ],
  exports: [
    WorkflowService,
    NamespacesService,
    WorkspaceService,
    PipelineService,
  ],
})
export class PersistenceModule {}
