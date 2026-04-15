import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity, WorkflowCheckpointEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { CommonModule } from '../common';
import { WorkflowCheckpointService, WorkflowService, WorkspaceService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkspaceEntity, DocumentEntity, WorkflowCheckpointEntity]),
    CommonModule,
  ],
  providers: [WorkflowService, WorkspaceService, WorkflowCheckpointService],
  exports: [WorkflowService, WorkspaceService, WorkflowCheckpointService],
})
export class PersistenceModule {}
