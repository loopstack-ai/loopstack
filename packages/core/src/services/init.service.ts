import { Injectable } from '@nestjs/common';
import { ModelInterface } from '../interfaces/model.interface';
import { WorkspaceCollectionService } from './workspace-collection.service';
import { ProjectCollectionService } from './project-collection.service';
import { UtilsCollectionService } from './utils-collection.service';
import { ModelSchemaValidatorService } from './model-schema-validator.service';
import { PipelineCollectionService } from './pipeline-collection.service';
import { WorkflowCollectionService } from './workflow-collection.service';
import { WorkflowTemplateCollectionService } from './workflow-template-collection.service';
import { ActionCollectionService } from './action-collection.service';
import { PromptTemplateCollectionService } from './prompt-template-collection.service';
import { LlmModelCollectionService } from './llm-model-collection.service';
import { EntityCollectionService } from './entity-collection.service';

@Injectable()
export class InitService {
  constructor(
    private modelSchemaValidatorService: ModelSchemaValidatorService,
    private workspaceCollectionService: WorkspaceCollectionService,
    private projectCollectionService: ProjectCollectionService,
    private utilCollectionService: UtilsCollectionService,
    private pipelineCollectionService: PipelineCollectionService,
    private workflowCollectionService: WorkflowCollectionService,
    private workflowTemplateCollectionService: WorkflowTemplateCollectionService,
    private actionCollectionService: ActionCollectionService,
    private promptTemplateCollectionService: PromptTemplateCollectionService,
    private llmModelCollectionService: LlmModelCollectionService,
    private entityCollectionService: EntityCollectionService,
  ) {}

  createFromConfig(data: any): any {
    const config: ModelInterface =
      this.modelSchemaValidatorService.validate(data);

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
    this.llmModelCollectionService.create(config.llmModels ?? []);
    this.entityCollectionService.create(config.entities ?? []);
  }
}
