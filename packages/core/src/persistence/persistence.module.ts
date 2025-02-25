import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowService } from './services/workflow.service';
import { WorkflowStateEntity } from './entities/workflow-state.entity';
import { ProjectEntity } from './entities/project.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkflowEntity } from './entities/workflow.entity';
import { DocumentEntity } from './entities/document.entity';
import { ProjectService } from './services/project.service';
import { WorkspaceService } from './services/workspace.service';
import { ProjectRepository } from './repositories/project.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkflowStateEntity,
      WorkspaceEntity,
    ]),
  ],
  providers: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
  ],
  exports: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
  ],
})
export class PersistenceModule {}
