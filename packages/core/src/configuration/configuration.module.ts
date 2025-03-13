import { Module } from '@nestjs/common';
import { ActionCollectionService } from './services/action-collection.service';
import { CollectionService } from './services/collection.service';
import { EntityCollectionService } from './services/entity-collection.service';
import { AdapterCollectionService } from './services/adapter-collection.service';
import { InitService } from './services/init.service';
import { WorkflowCollectionService } from './services/workflow-collection.service';
import { ProjectCollectionService } from './services/project-collection.service';
import { PromptTemplateCollectionService } from './services/prompt-template-collection.service';
import { ToolWrapperCollectionService } from './services/tool-wrapper-collection.service';
import { WorkspaceCollectionService } from './services/workspace-collection.service';
import { WorkflowTemplateCollectionService } from './services/workflow-template-collection.service';
import { ConfigModule } from '@nestjs/config';
import loadSchemas from './configuration';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ToolRegistry } from './services/tool.registry';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';
import { ActionRegistry } from './services/action-registry.service';
import { SnippetCollectionService } from './services/snippet-collection.service';

@Module({
  imports: [
    DiscoveryModule,
    ConfigModule.forRoot({
      load: [loadSchemas],
    }),
  ],
  providers: [
    InitService,
    CollectionService,
    ActionCollectionService,
    EntityCollectionService,
    SnippetCollectionService,
    AdapterCollectionService,
    WorkflowCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    ToolWrapperCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
    JsonSchemaGeneratorService,
    ToolRegistry,
    ActionRegistry,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [
    InitService,
    ActionCollectionService,
    EntityCollectionService,
    SnippetCollectionService,
    AdapterCollectionService,
    WorkflowCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    ToolWrapperCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
    ToolRegistry,
    ActionRegistry,
  ],
})
export class ConfigurationModule {}
