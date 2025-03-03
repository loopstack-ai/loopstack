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
import { DocumentService } from './services/document.service';
import {NamespacesService} from "./services/namespace.service";
import {NamespaceEntity} from "./entities/namespace.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkflowStateEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
  ],
  providers: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
    DocumentService,
    NamespacesService,
  ],
  exports: [
    WorkflowService,
    ProjectService,
    WorkspaceService,
    ProjectRepository,
    DocumentService,
    NamespacesService,
  ],
})
export class PersistenceModule {}
