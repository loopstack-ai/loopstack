import { Injectable } from '@nestjs/common';
import { WorkspaceCollectionService } from './workspace-collection.service';
import { ProjectCollectionService } from './project-collection.service';
import { UtilCollectionService } from './util-collection.service';
import { PipelineCollectionService } from './pipeline-collection.service';
import { WorkflowCollectionService } from './workflow-collection.service';
import { WorkflowTemplateCollectionService } from './workflow-template-collection.service';
import { ActionCollectionService } from './action-collection.service';
import { PromptTemplateCollectionService } from './prompt-template-collection.service';
import { AdapterCollectionService } from './adapter-collection.service';
import { EntityCollectionService } from './entity-collection.service';
import {
  MainConfigInterface,
  MainSchema,
} from '@loopstack/shared/dist/schemas/main.schema';

@Injectable()
export class InitService {
  constructor(
    private workspaceCollectionService: WorkspaceCollectionService,
    private projectCollectionService: ProjectCollectionService,
    private utilCollectionService: UtilCollectionService,
    private pipelineCollectionService: PipelineCollectionService,
    private workflowCollectionService: WorkflowCollectionService,
    private workflowTemplateCollectionService: WorkflowTemplateCollectionService,
    private actionCollectionService: ActionCollectionService,
    private promptTemplateCollectionService: PromptTemplateCollectionService,
    private llmModelCollectionService: AdapterCollectionService,
    private entityCollectionService: EntityCollectionService,
  ) {}

  clear() {
    this.workspaceCollectionService.clear();
    this.projectCollectionService.clear();
    this.utilCollectionService.clear();
    this.pipelineCollectionService.clear();
    this.workflowCollectionService.clear();
    this.workflowTemplateCollectionService.clear();
    this.actionCollectionService.clear();
    this.promptTemplateCollectionService.clear();
    this.llmModelCollectionService.clear();
    this.entityCollectionService.clear();
  }

  createFromConfig(data: MainConfigInterface): any {
    const config = MainSchema.parse(data);

    this.workspaceCollectionService.create(config.workspaces ?? []);
    this.projectCollectionService.create(config.projects ?? []);
    this.utilCollectionService.create(config.utils ?? []);
    this.pipelineCollectionService.create(config.pipelines ?? []);
    this.workflowCollectionService.create(config.workflows ?? []);
    this.workflowTemplateCollectionService.create(
      config.workflowTemplates ?? [],
    );
    this.actionCollectionService.create(config.actions ?? []);
    this.promptTemplateCollectionService.create(config.promptTemplates ?? []);
    this.llmModelCollectionService.create(config.adapter ?? []);
    this.entityCollectionService.create(config.entities ?? []);
  }
}
