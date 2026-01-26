import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiGenerateText, AiMessageDocument } from '@loopstack/ai-module';
import { BlockConfig, Document, Tool, WithArguments, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateDocument } from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
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
export class PromptWorkflow extends WorkflowBase {
  @Tool() private createDocument: CreateDocument;
  @Tool() private aiGenerateText: AiGenerateText;
  @Document() private aiMessageDocument: AiMessageDocument;
}
