import { z } from 'zod';
import { DocumentConfigSchema } from './document.schema';
import { ToolConfigSchema } from './tool-config.schema';
import { WorkflowSchema } from './workflow.schema';
import { WorkspaceSchema } from './workspace.schema';

export const BlockConfigSchema = z.discriminatedUnion('type', [
  WorkflowSchema,
  DocumentConfigSchema,
  ToolConfigSchema,
  WorkspaceSchema,
]);
