import { z } from 'zod';
import type { JSONSchemaDefinition } from '../schemas/json-schema.schema.js';
import type { JSONSchemaConfigType, StaticDocumentMeta, UiFormType, WorkflowTransitionType } from '../types/index.js';

export const StudioWidgetConfigSchema = z.object({
  widget: z.string(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type StudioWidgetConfig = z.infer<typeof StudioWidgetConfigSchema>;

export const StudioUiConfigSchema = z.object({
  widgets: z.array(StudioWidgetConfigSchema).optional(),
});
export type StudioUiConfig = z.infer<typeof StudioUiConfigSchema>;

export const StudioFeatureRegistrationSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
});
export type StudioFeatureRegistration = z.infer<typeof StudioFeatureRegistrationSchema>;

export const StudioWorkflowConfigSchema = z.object({
  workflowName: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  schema: z.custom<JSONSchemaDefinition>().optional(),
});
export type StudioWorkflowConfig = z.infer<typeof StudioWorkflowConfigSchema>;

export const StudioDocumentConfigSchema = z.object({
  documentName: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  ui: z.custom<UiFormType>().optional(),
  tags: z.array(z.string()).optional(),
  meta: z.custom<StaticDocumentMeta>().optional(),
  schema: z.custom<JSONSchemaDefinition>().optional(),
});
export type StudioDocumentConfig = z.infer<typeof StudioDocumentConfigSchema>;

export const StudioAppConfigSchema = z.object({
  appName: z.string(),
  title: z.string(),
  description: z.string().optional(),
  ui: StudioUiConfigSchema.optional(),
  features: z.array(StudioFeatureRegistrationSchema),
  extensions: z.record(z.string(), z.array(z.unknown())),
  workflows: z.array(StudioWorkflowConfigSchema),
  documents: z.array(StudioDocumentConfigSchema),
});
export type StudioAppConfig = z.infer<typeof StudioAppConfigSchema>;

export const WorkflowConfigSchema = z.object({
  workflowName: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  schema: z.custom<JSONSchemaConfigType>().optional(),
  ui: z.custom<UiFormType>().optional(),
  transitions: z.array(z.custom<WorkflowTransitionType>()).optional(),
});
export type WorkflowConfigInterface = z.infer<typeof WorkflowConfigSchema>;

export const ToolConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  ui: z.custom<UiFormType>().optional(),
});
export type ToolConfigInterface = z.infer<typeof ToolConfigSchema>;

export const WorkflowSourceSchema = z.object({
  name: z.string(),
  filePath: z.string().nullable(),
  raw: z.string().nullable(),
});
export type WorkflowSourceInterface = z.infer<typeof WorkflowSourceSchema>;

export const AvailableEnvironmentSchema = z.object({
  type: z.string(),
  name: z.string(),
  connectionUrl: z.string(),
  agentUrl: z.string().optional(),
  local: z.boolean().optional(),
});
export type AvailableEnvironmentInterface = z.infer<typeof AvailableEnvironmentSchema>;
