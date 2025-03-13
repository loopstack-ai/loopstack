import { Injectable } from '@nestjs/common';
import { WorkspaceCollectionService } from './workspace-collection.service';
import { ProjectCollectionService } from './project-collection.service';
import { ToolWrapperCollectionService } from './tool-wrapper-collection.service';
import { WorkflowCollectionService } from './workflow-collection.service';
import { WorkflowTemplateCollectionService } from './workflow-template-collection.service';
import { ActionCollectionService } from './action-collection.service';
import { PromptTemplateCollectionService } from './prompt-template-collection.service';
import { AdapterCollectionService } from './adapter-collection.service';
import { EntityCollectionService } from './entity-collection.service';
import { DynamicSchemaGeneratorService } from './dynamic-schema-generator.service';
import { SnippetCollectionService } from './snippet-collection.service';

@Injectable()
export class InitService {
  constructor(
    private mainSchemaGenerator: DynamicSchemaGeneratorService,
    private workspaceCollectionService: WorkspaceCollectionService,
    private projectCollectionService: ProjectCollectionService,
    private toolWrapperCollectionService: ToolWrapperCollectionService,
    private workflowCollectionService: WorkflowCollectionService,
    private workflowTemplateCollectionService: WorkflowTemplateCollectionService,
    private actionCollectionService: ActionCollectionService,
    private promptTemplateCollectionService: PromptTemplateCollectionService,
    private llmModelCollectionService: AdapterCollectionService,
    private entityCollectionService: EntityCollectionService,
    private snippetCollectionService: SnippetCollectionService,
  ) {}

  clear() {
    this.workspaceCollectionService.clear();
    this.projectCollectionService.clear();
    this.toolWrapperCollectionService.clear();
    this.workflowCollectionService.clear();
    this.workflowTemplateCollectionService.clear();
    this.actionCollectionService.clear();
    this.promptTemplateCollectionService.clear();
    this.llmModelCollectionService.clear();
    this.entityCollectionService.clear();
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
    this.llmModelCollectionService.create(config.adapter ?? []);
    this.entityCollectionService.create(config.entities ?? []);
    this.snippetCollectionService.create(config.snippets ? Object.entries(config.snippets).map(([name, value]) => ({ name, value})) : []);
  }

  init(configs: any[]) {
    this.clear();
    for (const config of configs) {
      this.createFromConfig(config);
    }
  }
}
