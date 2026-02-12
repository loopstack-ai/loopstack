import { z } from 'zod';
import { AiGenerateText, AiMessageDocument, AiMessageDocumentContentType } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, Input, Runtime, ToolResult, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';

@Workflow({
  configFile: __dirname + '/prompt.workflow.yaml',
})
export class PromptWorkflow {
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private aiGenerateText: AiGenerateText;
  @InjectDocument() private aiMessageDocument: AiMessageDocument;

  @Input({
    schema: z.object({
      subject: z.string().default('coffee'),
    }),
  })
  args: {
    subject: string;
  };

  @Runtime()
  runtime: {
    tools: Record<'prompt', Record<'llm_call', ToolResult<AiMessageDocumentContentType>>>;
  };
}
