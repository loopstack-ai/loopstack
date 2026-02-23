import { z } from 'zod';
import { BlockSchema } from './block.schema';

const VolumeSchema = z.object({
  path: z.string(),
  permissions: z.array(z.enum(['read', 'write'])),
});

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
      volume: z.string().optional(),
      options: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

export const WorkspaceSchema = BlockSchema.extend({
  type: z.literal('workspace').default('workspace'),
  title: z.string().optional(),
  description: z.string().optional(),
  volumes: z.record(z.string(), VolumeSchema).optional(),
  features: FeaturesSchema.optional(),
});
