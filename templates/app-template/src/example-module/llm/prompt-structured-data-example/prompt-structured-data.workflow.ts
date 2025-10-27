import { Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { AiGenerateObject } from '@loopstack/llm';
import { FileDocument } from './documents/file-document';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [
    AiGenerateObject,
    FileDocument,
  ],
  config: {
    title: 'Example 3: LLM Prompt Structured Data',
  },
  configFile: __dirname + '/prompt-structured-data.workflow.yaml',
})
export class PromptStructuredDataWorkflow extends Workflow {
  @Input()
  @Expose()
  file: FileDocument;
}