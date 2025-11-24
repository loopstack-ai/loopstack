import { z } from 'zod';
import { TemplateExpression } from './template-expression.schema';
import { BlockSchema } from './block.schema';
import { UiFormSchema } from './ui-form.schema';

export const MimeTypeSchema = z.enum([
  "text/plain",
  "text/html",
  "text/css",
  "text/xml",
  "text/markdown",
  "application/javascript",
  "application/typescript",
  "application/json",
  "application/xml",
  "application/yaml",
]);

export type MimeType = z.infer<typeof MimeTypeSchema>;

export const DocumentConfigSchema = BlockSchema.extend({
  type: z.literal('document').default('document').optional(),
  description: z.string().optional(),
  content: z.any().optional(),
  ui: UiFormSchema.optional(),
  tags: z.union([
    TemplateExpression,
    z.array(z.string()),
  ]).optional(),
  meta: z.object({
    hidden: z.union([
      z.boolean(),
      TemplateExpression,
    ]).optional(),
    mimeType: z.union([
      MimeTypeSchema,
      TemplateExpression,
    ]).optional(),
    invalidate: z.union([
      z.boolean(),
      TemplateExpression,
    ]).optional(),
    level: z.union([
      TemplateExpression,
      z.literal('debug'),
      z.literal('info'),
      z.literal('warning'),
      z.literal('error'),
    ]).optional(),
    enableAtPlaces: z.array(z.string()).optional(),
    hideAtPlaces: z.array(z.string()).optional(),
    data: z.any().optional(),
  }).optional(),
})

export type DocumentConfigType = z.infer<typeof DocumentConfigSchema>;

export const DocumentSchema = z.object({
  type: z.literal('document').default('document').optional(),
  description: z.string().optional(),
  content: z.any().optional(),
  ui: UiFormSchema.optional(),
  tags: z.array(z.string()).optional(),
  meta: z.object({
    hidden: z.boolean().optional(),
    mimeType: MimeTypeSchema.optional(),
    invalidate: z.boolean().optional(),
    level: z.union([
      z.literal('debug'),
      z.literal('info'),
      z.literal('warning'),
      z.literal('error'),
    ]).optional(),
    enableAtPlaces: z.array(z.string()).optional(),
    hideAtPlaces: z.array(z.string()).optional(),
    data: z.any().optional(),
  }).optional(),
})

export type DocumentType = z.infer<typeof DocumentSchema>;

export const DocumentMessageContentSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.string(),
    function: z.object({
      name: z.string(),
      arguments: z.string().optional(),
    })
  })).optional(),
  animation: z.string().optional(),
  icon: z.string().optional(),
});

export const DocumentMessageSchema = DocumentSchema.extend({
  content: DocumentMessageContentSchema,
});

export type DocumentMessageType = z.infer<typeof DocumentMessageSchema>;

