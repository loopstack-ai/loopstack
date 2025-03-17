import { Injectable, OnModuleInit } from '@nestjs/common';
import { WorkspaceCollectionService } from './workspace-collection.service';
import { ProjectCollectionService } from './project-collection.service';
import { ToolCollectionService } from './tool-collection.service';
import { WorkflowCollectionService } from './workflow-collection.service';
import { WorkflowTemplateCollectionService } from './workflow-template-collection.service';
import { ActionCollectionService } from './action-collection.service';
import { PromptTemplateCollectionService } from './prompt-template-collection.service';
import { AdapterCollectionService } from './adapter-collection.service';
import { DocumentCollectionService } from './document-collection.service';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { SnippetCollectionService } from './snippet-collection.service';
import { ConfigService } from '@nestjs/config';
import { ActionRegistry } from './action-registry.service';
import { AdapterRegistry } from './adapter-registry.service';
import { ToolRegistry } from './tool.registry';

@Injectable()
export class InitService implements OnModuleInit{

  constructor(
    private configService: ConfigService,
    private actionRegistry: ActionRegistry,
    private adapterRegistry: AdapterRegistry,
    private toolRegistry: ToolRegistry,

    private mainSchemaGenerator: DynamicSchemaGeneratorService,
    private workspaceCollectionService: WorkspaceCollectionService,
    private projectCollectionService: ProjectCollectionService,
    private toolWrapperCollectionService: ToolCollectionService,
    private workflowCollectionService: WorkflowCollectionService,
    private workflowTemplateCollectionService: WorkflowTemplateCollectionService,
    private actionCollectionService: ActionCollectionService,
    private promptTemplateCollectionService: PromptTemplateCollectionService,
    private adapterCollectionService: AdapterCollectionService,
    private documentCollectionService: DocumentCollectionService,
    private snippetCollectionService: SnippetCollectionService,
  ) {}

  onModuleInit() {
    const configs = this.configService.get('configs');
    this.init(configs);
  }

  clear() {
    this.workspaceCollectionService.clear();
    this.projectCollectionService.clear();
    this.toolWrapperCollectionService.clear();
    this.workflowCollectionService.clear();
    this.workflowTemplateCollectionService.clear();
    this.actionCollectionService.clear();
    this.promptTemplateCollectionService.clear();
    this.adapterCollectionService.clear();
    this.documentCollectionService.clear();
    this.snippetCollectionService.clear();
  }

  createFromConfig(data: any): any {
    const config = this.mainSchemaGenerator.getSchema().parse(data);

    this.workspaceCollectionService.create(config.workspaces ?? []);
    this.projectCollectionService.create(config.projects ?? []);
    this.toolWrapperCollectionService.create(config.tools ?? []);
    this.workflowCollectionService.create(config.workflows ?? []);
    this.workflowTemplateCollectionService.create(
      config.workflowTemplates ?? [],
    );
    this.actionCollectionService.create(config.actions ?? []);
    this.promptTemplateCollectionService.create(config.promptTemplates ?? []);
    this.adapterCollectionService.create(config.adapters ?? []);
    this.documentCollectionService.create(config.documents ?? []);
    this.snippetCollectionService.create(config.snippets ? Object.entries(config.snippets).map(([name, value]) => ({ name, value})) : []);
  }

  init(configs: any[]) {
    this.actionRegistry.initialize();
    this.adapterRegistry.initialize();
    this.toolRegistry.initialize();

    this.clear();
    if (configs) {
      for (const config of configs) {
        this.createFromConfig(config);
      }
    }
  }
}
