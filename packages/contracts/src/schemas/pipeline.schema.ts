import { z } from 'zod';
import { NamespacePropsSchema } from './workflow.schema';
import { TemplateExpression } from './template-expression.schema';
import { BlockSchema } from './block.schema';
import { UiFormSchema } from './ui-form.schema';

export const PipelineBaseSchema = BlockSchema.extend({
  title: z.string().optional(),
  description: z.string().optional(),
  namespace: NamespacePropsSchema.optional(),
  ui: UiFormSchema.optional()
});

export const PipelineItemConfigSchema = z.object({
  id: z.string().optional(),
  block: z.string(),
  condition: z.union([
    z.string(), // for handlebars expressions
    TemplateExpression.optional(),
  ]),
  args: z.any().optional(),
});

export type PipelineItemConfigType = z.infer<typeof PipelineItemConfigSchema>;

export const PipelineItemSchema = z.object({
  id: z.string().optional(),
  block: z.string(),
  condition: z
    .union([z.boolean(), z.string()])
    .optional(),
  args: z.any().optional(),
});

export type PipelineItemType = z.infer<typeof PipelineItemSchema>;

export const PipelineFactoryIteratorConfigSchema = z.object({
  source: z.union([
    TemplateExpression,
    z.array(z.string()),
  ]),
});

export type PipelineFactoryIteratorConfigType = z.infer<typeof PipelineFactoryIteratorConfigSchema>;

export const PipelineFactoryConfigSchema = PipelineBaseSchema.extend({
  type: z.literal('factory').default('factory'),
  namespace: NamespacePropsSchema,
  factory: PipelineItemConfigSchema,
  parallel: z.boolean().optional(),
  iterator: PipelineFactoryIteratorConfigSchema,
});

export type PipelineFactoryConfigType = z.infer<typeof PipelineFactoryConfigSchema>;

export const PipelineFactoryIteratorSchema = z.object({
  source: z.array(z.string()),
});

export type PipelineFactoryIteratorType = z.infer<typeof PipelineFactoryIteratorSchema>;

export const PipelineFactorySchema = PipelineBaseSchema.extend({
  namespace: NamespacePropsSchema,
  factory: PipelineItemSchema,
  parallel: z.boolean().optional(),
  iterator: PipelineFactoryIteratorSchema,
});

export type PipelineFactoryType = z.infer<typeof PipelineFactorySchema>;

export const PipelineSequenceSchema = PipelineBaseSchema.extend({
  type: z.literal('sequence').default('sequence'),
  sequence: z.array(PipelineItemConfigSchema),
});

export type PipelineSequenceType = z.infer<typeof PipelineSequenceSchema>;

