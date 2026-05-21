import { z } from 'zod';
import { BlockSchema } from './block.schema.js';
import { EnvironmentConfigSchema } from './environment-config.schema.js';

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

const AppActionSchema = z.object({
  widget: z.string(),
  options: z.record(z.string(), z.any()).optional(),
});

const AppUiSchema = z.object({
  widgets: z.array(AppActionSchema).optional(),
});

export const AppSchema = BlockSchema.extend({
  type: z.literal('app').default('app'),
  title: z.string().optional(),
  description: z.string().optional(),
  features: FeaturesSchema.optional(),
  environments: z.array(EnvironmentConfigSchema).optional(),
  ui: AppUiSchema.optional(),
});
