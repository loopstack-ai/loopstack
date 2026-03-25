import { z } from 'zod';
import { ClaudeGenerateDocument, ClaudeMessageDocument } from '@loopstack/claude-module';
import { InjectDocument, InjectTool, Input, Runtime, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';
import { FileDocument } from './documents/file-document';

@Workflow({
  configFile: __dirname + '/prompt-structured-output.workflow.yaml',
})
export class PromptStructuredOutputWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;

  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
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
  runtime: any;
}
