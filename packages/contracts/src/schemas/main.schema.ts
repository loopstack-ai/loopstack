import { z } from 'zod';
import { DocumentConfigSchema } from './document.schema.js';
import { ToolConfigSchema } from './tool-config.schema.js';
import { WorkflowSchema } from './workflow.schema.js';
import { WorkspaceSchema } from './workspace.schema.js';

export const BlockConfigSchema = z.discriminatedUnion('type', [
  WorkflowSchema,
  DocumentConfigSchema,
  ToolConfigSchema,
  WorkspaceSchema,
]);
