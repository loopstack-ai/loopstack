import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiGenerateDocument, AiMessageDocument } from '@loopstack/ai-module';
import { Document, Tool, WithArguments } from '@loopstack/common';
import { BlockConfig, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateDocument } from '@loopstack/core-ui-module';
import { FileDocument, FileDocumentSchema } from './documents/file-document';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/prompt-structured-output.workflow.yaml',
})
@WithArguments(
  z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
)
@WithState(
  z.object({
    file: FileDocumentSchema,
  }),
)
export class PromptStructuredOutputWorkflow extends WorkflowBase {
  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateDocument: AiGenerateDocument;

  @Document() aiMessageDocument: AiMessageDocument;
  @Document() fileDocument: FileDocument;
}
