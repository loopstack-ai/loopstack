import { z, ZodType } from 'zod';
import { ToolConfigSchema } from './tool-config.schema';
import { WorkspaceSchema } from './workspace.schema';
import { ProjectSchema } from './project.schema';
import { createWorkflowSchema } from './workflow.schema';
import { WorkflowTemplateSchema } from './workflow-template.schema';
import { ActionSchema } from './action.schema';
import { PromptTemplateSchema } from './prompt-template.schema';
import { AdapterSchema } from './adapter.schema';
import { EntitySchema } from './entity.schema';

export interface DynamicSchemasInterface {
    toolConfigSchema: ZodType;
    actionConfigSchema: ZodType;
}

export class MainSchemaGenerator {
    dynamicSchemas: DynamicSchemasInterface;

    toolConfigSchema: ZodType;
    actionConfigSchema: ZodType;
    workflowSchema: ZodType;
    schema: ZodType;

    getActionConfigSchema() {
        if (!this.actionConfigSchema) {
            this.actionConfigSchema = ActionSchema(this.dynamicSchemas);
        }

        return this.actionConfigSchema;
    }

    getToolConfigSchema() {
        if (!this.toolConfigSchema) {
            this.toolConfigSchema = ToolConfigSchema(this.dynamicSchemas);
        }

        return this.toolConfigSchema;
    }

    getWorkflowSchema() {
        if (!this.workflowSchema) {
            this.workflowSchema = createWorkflowSchema(this.dynamicSchemas);
        }

        return this.workflowSchema;
    }

    constructor(dynamicSchemas: DynamicSchemasInterface) {
        this.dynamicSchemas = dynamicSchemas;

        this.schema = z.object({
            workspaces: z.array(WorkspaceSchema).optional(),
            projects: z.array(ProjectSchema).optional(),
            tools: z.array(
              this.getToolConfigSchema()
            ).optional(),
            workflows: z.array(
              this.getWorkflowSchema()
            ).optional(),
            workflowTemplates: z.array(WorkflowTemplateSchema).optional(),
            actions: z.array(
              this.getActionConfigSchema()
            ).optional(),
            promptTemplates: z.array(PromptTemplateSchema).optional(),
            adapter: z.array(AdapterSchema).optional(),
            entities: z.array(EntitySchema).optional(),
        }).strict();
    }

    getSchema() {
        return this.schema;
    }
}
