import { Module } from '@nestjs/common';
import { ActionCollectionService } from './services/action-collection.service';
import { CollectionService } from './services/collection.service';
import { DocumentCollectionService } from './services/document-collection.service';
import { AdapterCollectionService } from './services';
import { AdapterRegistry, InitService } from './services';
import { WorkflowCollectionService } from './services/workflow-collection.service';
import { ProjectCollectionService } from './services/project-collection.service';
import { PromptTemplateCollectionService } from './services/prompt-template-collection.service';
import { ToolCollectionService } from './services';
import { WorkspaceCollectionService } from './services/workspace-collection.service';
import { WorkflowTemplateCollectionService } from './services/workflow-template-collection.service';
import { ConfigModule } from '@nestjs/config';
import loadSchemas from './configuration';
import { JsonSchemaGeneratorService } from './services/json-schema-generator.service';
import { ToolRegistry } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { DynamicSchemaGeneratorService } from './services/dynamic-schema-generator.service';
import { DiscoveryModule } from '@nestjs/core';
import { ActionRegistry } from './services';
import { SnippetCollectionService } from './services';

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
    DocumentCollectionService,
    SnippetCollectionService,
    AdapterCollectionService,
    WorkflowCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    ToolCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
    JsonSchemaGeneratorService,
    ToolRegistry,
    ActionRegistry,
    AdapterRegistry,
    AdapterCollectionService,
    GenerateSchemasCommand,
    DynamicSchemaGeneratorService,
  ],
  exports: [
    InitService,
    ActionCollectionService,
    DocumentCollectionService,
    SnippetCollectionService,
    AdapterCollectionService,
    WorkflowCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    ToolCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
    ToolRegistry,
    ActionRegistry,
    AdapterRegistry,
    AdapterCollectionService,
  ],
})
export class ConfigurationModule {}
