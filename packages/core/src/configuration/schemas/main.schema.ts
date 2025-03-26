import { z } from 'zod';
import { WorkspaceSchema } from './workspace.schema';
import { ProjectSchema } from './project.schema';
import { WorkflowTemplateSchema } from './workflow-template.schema';
import { PromptTemplateSchema } from './prompt-template.schema';
import { DocumentSchema } from '@loopstack/shared';
import { WorkflowSchema } from './workflow.schema';
import { ServiceConfigSchema } from './service-config.schema';

export const MainBaseSchema = z
  .object({
    workspaces: z.array(WorkspaceSchema).optional(),
    projects: z.array(ProjectSchema).optional(),
    workflows: z.array(WorkflowSchema).optional(),
    workflowTemplates: z.array(WorkflowTemplateSchema).optional(),
    promptTemplates: z.array(PromptTemplateSchema).optional(),
    documents: z.array(DocumentSchema).optional(),
    snippets: z.any(),
    tools: z.array(ServiceConfigSchema).optional(),
    adapters: z.array(ServiceConfigSchema).optional(),
  })
  .strict();

export type MainBaseType = z.infer<typeof MainBaseSchema>;
