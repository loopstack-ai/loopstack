import { Module } from '@nestjs/common';
import { ActionCollectionService } from './services/action-collection.service';
import { CollectionService } from './services/collection.service';
import { EntityCollectionService } from './services/entity-collection.service';
import { LlmModelCollectionService } from './services/llm-model-collection.service';
import { InitService } from './services/init.service';
import { PipelineCollectionService } from './services/pipeline-collection.service';
import { ProjectCollectionService } from './services/project-collection.service';
import { PromptTemplateCollectionService } from './services/prompt-template-collection.service';
import { UtilsCollectionService } from './services/utils-collection.service';
import { WorkspaceCollectionService } from './services/workspace-collection.service';
import { WorkflowTemplateCollectionService } from './services/workflow-template-collection.service';
import { WorkflowCollectionService } from './services/workflow-collection.service';
import { ModelSchemaValidatorService } from './services/model-schema-validator.service';
import {ConfigModule} from "@nestjs/config/dist/config.module";
import loadSchemas from "./configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadSchemas],
    }),
  ],
  providers: [
    InitService,
    ModelSchemaValidatorService,
    CollectionService,
    ActionCollectionService,
    EntityCollectionService,
    LlmModelCollectionService,
    PipelineCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    UtilsCollectionService,
    WorkflowCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
  ],
  exports: [
    InitService,
    ActionCollectionService,
    EntityCollectionService,
    LlmModelCollectionService,
    PipelineCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    UtilsCollectionService,
    WorkflowCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
  ],
})
export class ConfigurationModule {}
