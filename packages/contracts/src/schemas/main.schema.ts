import { z } from 'zod';
import { DocumentConfigSchema } from './document.schema';
import { PipelineFactoryConfigSchema, PipelineSequenceSchema } from './pipeline.schema';
import { ToolConfigSchema } from './tool-config.schema';
import { WorkflowSchema } from './workflow.schema';
import { WorkspaceSchema } from './workspace.schema';

export const BlockConfigSchema = z.discriminatedUnion('type', [
  PipelineFactoryConfigSchema,
  PipelineSequenceSchema,
  WorkflowSchema,
  DocumentConfigSchema,
  ToolConfigSchema,
  WorkspaceSchema,
]);
