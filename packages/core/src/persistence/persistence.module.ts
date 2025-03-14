import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowService } from './services/workflow.service';
import { ProjectEntity } from './entities';
import { WorkspaceEntity } from './entities';
import { WorkflowEntity } from './entities';
import { DocumentEntity } from './entities';
import { ProjectService } from './services/project.service';
import { WorkspaceService } from './services/workspace.service';
import { ProjectRepository } from './repositories/project.repository';
import { DocumentService } from './services/document.service';
import { NamespacesService } from './services/namespace.service';
import { NamespaceEntity } from './entities';

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
