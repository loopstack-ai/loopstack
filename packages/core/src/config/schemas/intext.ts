import { Schema } from 'ajv';

const mainSchema = require('./main.schema.json');
const actionSchema = require('./action.schema.json');
const entitySchema = require('./entity.schema.json');
const functionFromSchema = require('./function-from.schema.json');
const llmModelSchema = require('./llm-model.schema.json');
const pipelineSchema = require('./pipeline.schema.json');
const projectSchema = require('./project.schema.json');
const promptTemplateSchema = require('./prompt-template.schema.json');
const utilSchema = require('./util.schema.json');
const workflowSchema = require('./workflow.schema.json');
const workflowObserverSchema = require('./workflow-observer.schema.json');
const workflowTemplateSchema = require('./workflow-template.schema.json');
const workflowTransitionSchema = require('./workflow-transition.schema.json');
const workspaceSchema = require('./workspace.schema.json');

export const modelSchemas: {
  mainSchema: Schema;
  other: Schema[];
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
  ],
};
