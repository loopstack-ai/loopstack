import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiGenerateText, AiMessageDocument } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, WithArguments, WithState, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';

@Injectable()
@Workflow({
  configFile: __dirname + '/prompt.workflow.yaml',
})
@WithArguments(
  z.object({
    subject: z.string().default('coffee'),
  }),
)
@WithState(
  z.object({
    llmResponse: z.any().optional(),
  }),
)
export class PromptWorkflow {
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private aiGenerateText: AiGenerateText;
  @InjectDocument() private aiMessageDocument: AiMessageDocument;
}
