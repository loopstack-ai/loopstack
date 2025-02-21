import { Module } from '@nestjs/common';
import { ActionCollectionService } from './services/action-collection.service';
import { CollectionService } from './services/collection.service';
import { EntityCollectionService } from './services/entity-collection.service';
import { AdapterCollectionService } from './services/adapter-collection.service';
import { InitService } from './services/init.service';
import { PipelineCollectionService } from './services/pipeline-collection.service';
import { ProjectCollectionService } from './services/project-collection.service';
import { PromptTemplateCollectionService } from './services/prompt-template-collection.service';
import { UtilCollectionService } from './services/util-collection.service';
import { WorkspaceCollectionService } from './services/workspace-collection.service';
import { WorkflowTemplateCollectionService } from './services/workflow-template-collection.service';
import { WorkflowCollectionService } from './services/workflow-collection.service';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import loadSchemas from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadSchemas],
    }),
  ],
  providers: [
    InitService,
    CollectionService,
    ActionCollectionService,
    EntityCollectionService,
    AdapterCollectionService,
    PipelineCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    UtilCollectionService,
    WorkflowCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
  ],
  exports: [
    InitService,
    ActionCollectionService,
    EntityCollectionService,
    AdapterCollectionService,
    PipelineCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    UtilCollectionService,
    WorkflowCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
  ],
})
export class ConfigurationModule {}
