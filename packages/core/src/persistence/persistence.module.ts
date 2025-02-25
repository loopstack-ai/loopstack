import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowStateService } from './services/workflow-state.service';
import { WorkflowStateEntity } from './entities/workflow-state.entity';
import { ProjectEntity } from './entities/project.entity';
import { UserInputEntity } from './entities/user-input.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkflowEntity } from './entities/workflow.entity';
import { DocumentEntity } from './entities/document.entity';
import { ProjectService } from './services/project.service';
import {WorkspaceService} from "./services/workspace.service";
import {ProjectRepository} from "./repositories/project.repository";
import {EntityManager} from "typeorm";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      UserInputEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkflowStateEntity,
      WorkspaceEntity,
    ]),
  ],
  providers: [
    WorkflowStateService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
  ],
  exports: [
    WorkflowStateService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
  ],
})
export class PersistenceModule {}
