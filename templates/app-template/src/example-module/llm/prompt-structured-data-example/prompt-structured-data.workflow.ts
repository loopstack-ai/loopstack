import { Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { AiGenerateDocument } from '@loopstack/llm';
import { FileDocument } from './documents/file-document';
import { Expose } from 'class-transformer';
import { z } from 'zod';

const propertiesSchema = z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
});

@BlockConfig({
  imports: [
    AiGenerateDocument,
    FileDocument,
  ],
  properties: propertiesSchema,
  configFile: __dirname + '/prompt-structured-data.workflow.yaml',
})
export class PromptStructuredDataWorkflow extends Workflow {
  @Input()
  @Expose()
  file: FileDocument;
}