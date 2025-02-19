import {Schema} from "ajv";

const mainSchema = require('../schema/main.schema.json');
const actionSchema = require('../schema/action.schema.json');
const entitySchema = require('../schema/entity.schema.json');
const functionFromSchema = require('../schema/function-from.schema.json');
const llmModelSchema = require('../schema/llm-model.schema.json');
const pipelineSchema = require('../schema/pipeline.schema.json');
const projectSchema = require('../schema/project.schema.json');
const promptTemplateSchema = require('../schema/prompt-template.schema.json');
const utilSchema = require('../schema/util.schema.json');
const workflowSchema = require('../schema/workflow.schema.json');
const workflowObserverSchema = require('../schema/workflow-observer.schema.json');
const workflowTemplateSchema = require('../schema/workflow-template.schema.json');
const workflowTransitionSchema = require('../schema/workflow-transition.schema.json');
const workspaceSchema = require('../schema/workspace.schema.json');

export const modelSchemas: {
    mainSchema: Schema,
    other: Schema[],
} = {
    mainSchema,
    other: [
        mainSchema,
        actionSchema,
        entitySchema,
        functionFromSchema,
        llmModelSchema,
        pipelineSchema,
        projectSchema,
        promptTemplateSchema,
        utilSchema,
        workflowSchema,
        workflowObserverSchema,
        workflowTemplateSchema,
        workflowTransitionSchema,
        workspaceSchema,
    ]
}