import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiGenerateDocument, AiMessageDocument } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, WithArguments, Workflow } from '@loopstack/common';
import { WithState } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { FileDocument, FileDocumentSchema } from './documents/file-document';

@Injectable()
@Workflow({
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
export class PromptStructuredOutputWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateDocument: AiGenerateDocument;

  @InjectDocument() aiMessageDocument: AiMessageDocument;
  @InjectDocument() fileDocument: FileDocument;
}
