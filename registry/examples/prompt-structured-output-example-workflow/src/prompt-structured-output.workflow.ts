import { z } from 'zod';
import { AiGenerateDocument, AiMessageDocument } from '@loopstack/ai-module';
import { DocumentEntity, InjectDocument, InjectTool, Input, Runtime, ToolResult, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { FileDocument, FileDocumentType } from './documents/file-document';

@Workflow({
  configFile: __dirname + '/prompt-structured-output.workflow.yaml',
})
export class PromptStructuredOutputWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateDocument: AiGenerateDocument;

  @InjectDocument() aiMessageDocument: AiMessageDocument;
  @InjectDocument() fileDocument: FileDocument;

  @Input({
    schema: z.object({
      language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
    }),
  })
  args: {
    language: string;
  };

  @Runtime()
  runtime: {
    tools: Record<'prompt', Record<'llm_call', ToolResult<DocumentEntity<FileDocumentType>>>>;
  };
}
