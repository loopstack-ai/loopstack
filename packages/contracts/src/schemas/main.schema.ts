import { z } from 'zod';
import { WorkspaceSchema } from './workspace.schema';
import { PipelineFactoryConfigSchema, PipelineSequenceSchema } from './pipeline.schema';
import {
    WorkflowSchema,
} from './workflow.schema';
import { ToolConfigSchema } from './tool-config.schema';
import { DocumentConfigSchema } from './document.schema';

export interface ConfigSourceInterface {
    path: string;
    relativePath: string;
    raw: string;
    config: any;
}

export const BlockConfigSchema = z.discriminatedUnion('type', [
    PipelineFactoryConfigSchema,
    PipelineSequenceSchema,
    WorkflowSchema,
    DocumentConfigSchema,
    ToolConfigSchema,
    WorkspaceSchema,
])

export type BlockConfigType = z.infer<typeof BlockConfigSchema>;
