import {WorkspaceInterface} from "./workspace.interface";
import {ProjectInterface} from "./project.interface";
import {UtilInterface} from "./util.interface";
import {PipelineInterface} from "./pipeline.interface";
import {WorkflowTemplateInterface} from "./workflow-template.interface";
import {ActionInterface} from "./action.interface";
import {PromptTemplateInterface} from "./prompt-template.interface";
import {LlmModelInterface} from "./llm-model.interface";
import {EntityInterface} from "./entity.interface";
import {WorkflowInterface} from "./workflow.interface";

export interface ModelInterface {
    workspaces: WorkspaceInterface[];
    projects: ProjectInterface[];
    utils: UtilInterface[];
    pipelines: PipelineInterface[];
    workflows: WorkflowInterface[];
    workflowTemplates: WorkflowTemplateInterface[];
    actions: ActionInterface[];
    promptTemplates: PromptTemplateInterface[];
    llmModels: LlmModelInterface[];
    entities: EntityInterface[];
}