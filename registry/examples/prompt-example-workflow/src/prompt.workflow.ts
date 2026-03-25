import { z } from 'zod';
import { ClaudeGenerateText, ClaudeMessageDocument } from '@loopstack/claude-module';
import { InjectDocument, InjectTool, Input, Runtime, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';

@Workflow({
  configFile: __dirname + '/prompt.workflow.yaml',
})
export class PromptWorkflow {
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private claudeGenerateText: ClaudeGenerateText;
  @InjectDocument() private claudeMessageDocument: ClaudeMessageDocument;

  @Input({
    schema: z.object({
      subject: z.string().default('coffee'),
    }),
  })
  args: {
    subject: string;
  };

  @Runtime()
  runtime: any;
}
