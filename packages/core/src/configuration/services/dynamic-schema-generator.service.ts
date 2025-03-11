import { z, ZodType } from 'zod';
import { ToolConfigSchema } from '../schemas/tool-config.schema';
import { WorkspaceSchema } from '../schemas/workspace.schema';
import { ProjectSchema } from '../schemas/project.schema';
import { createWorkflowSchema } from '../schemas/workflow.schema';
import { WorkflowTemplateSchema } from '../schemas/workflow-template.schema';
import { ActionSchema } from '../schemas/action.schema';
import { PromptTemplateSchema } from '../schemas/prompt-template.schema';
import { AdapterSchema } from '../schemas/adapter.schema';
import { DocumentSchema } from '../schemas/document.schema';
import { Injectable } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { ActionRegistry } from './action-registry.service';

export interface DynamicSchemasInterface {
    toolCallSchemas: ZodType;
    actionConfigSchemas: ZodType;
}

@Injectable()
export class DynamicSchemaGeneratorService {
    private dynamicSchemas: DynamicSchemasInterface;
    private toolConfigSchema: ZodType;
    private actionConfigSchema: ZodType;
    private workflowSchema: ZodType;
    private schema: ZodType;

    constructor(
      private readonly toolRegistry: ToolRegistry,
      private readonly actionRegistry: ActionRegistry,
    ) {}

    private getActionConfigSchema() {
        if (!this.actionConfigSchema) {
            this.actionConfigSchema = ActionSchema(this.dynamicSchemas);
        }

        return this.actionConfigSchema;
    }

    private getToolConfigSchema() {
        if (!this.toolConfigSchema) {
            this.toolConfigSchema = ToolConfigSchema(this.dynamicSchemas);
        }

        return this.toolConfigSchema;
    }

    private getWorkflowSchema() {
        if (!this.workflowSchema) {
            this.workflowSchema = createWorkflowSchema(this.dynamicSchemas);
        }

        return this.workflowSchema;
    }

    private createDynamicSchema() {
        const toolCallSchemas = this.toolRegistry.getToolCallSchemas();
        const actionSchemas = this.actionRegistry.getActionSchemas();

        // @ts-ignore
        const unionToolCallSchemas = z.discriminatedUnion("tool", toolCallSchemas);
        // @ts-ignore
        const unionActionSchemas = z.discriminatedUnion("service", actionSchemas);

        this.dynamicSchemas = {
            toolCallSchemas: unionToolCallSchemas,
            actionConfigSchemas: unionActionSchemas,
        };

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
            documents: z.array(DocumentSchema).optional(),
            custom: z.any(),
        }).strict();

        return this.schema;
    }

    getSchema() {
        if (!this.schema) {
            this.schema = this.createDynamicSchema();
        }
        return this.schema;
    }
}
