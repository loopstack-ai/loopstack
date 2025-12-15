import { WorkflowBase, } from '@loopstack/core';
import { Document, Tool, WithArguments } from '@loopstack/common';
import { BlockConfig, Input, WithState } from '@loopstack/common';
import { z } from 'zod';
import { FileDocument, FileDocumentSchema } from './documents/file-document';
import { CreateDocument } from '@loopstack/core-ui-module';
import { AiGenerateDocument, AiMessageDocument } from '@loopstack/ai-module';
import { Injectable } from '@nestjs/common';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/prompt-structured-output.workflow.yaml',
})
@WithArguments(z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
}))
@WithState(z.object({
  file: FileDocumentSchema,
}))
export class PromptStructuredOutputWorkflow extends WorkflowBase {

  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateDocument: AiGenerateDocument;

  @Document() aiMessageDocument: AiMessageDocument;
  @Document() fileDocument: FileDocument;

}