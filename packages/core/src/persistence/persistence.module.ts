import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  SecretEntity,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import { SecretService, WorkflowCheckpointService, WorkflowService, WorkspaceService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkspaceEntity, DocumentEntity, SecretEntity, WorkflowCheckpointEntity]),
    CommonModule,
  ],
  providers: [WorkflowService, WorkspaceService, SecretService, WorkflowCheckpointService],
  exports: [WorkflowService, WorkspaceService, SecretService, WorkflowCheckpointService],
})
export class PersistenceModule {}
