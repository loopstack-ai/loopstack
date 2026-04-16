import { z } from 'zod';
import { BlockSchema } from './block.schema';
import { EnvironmentConfigSchema } from './environment-config.schema';

const FeaturesSchema = z.object({
  sidebar: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  workflowHistory: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  workflowNavigation: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  debugWorkflow: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  fileExplorer: z
    .object({
      enabled: z.boolean().optional(),
      environments: z.array(z.string()).optional(),
      options: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  previewPanel: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  git: z
    .object({
      enabled: z.boolean().optional(),
      environments: z.array(z.string()).optional(),
    })
    .optional(),
});

const WorkspaceActionSchema = z.object({
  widget: z.string(),
  options: z.record(z.string(), z.any()).optional(),
});

const WorkspaceUiSchema = z.object({
  widgets: z.array(WorkspaceActionSchema).optional(),
});

export const WorkspaceSchema = BlockSchema.extend({
  type: z.literal('workspace').default('workspace'),
  title: z.string().optional(),
  description: z.string().optional(),
  features: FeaturesSchema.optional(),
  environments: z.array(EnvironmentConfigSchema).optional(),
  ui: WorkspaceUiSchema.optional(),
});
