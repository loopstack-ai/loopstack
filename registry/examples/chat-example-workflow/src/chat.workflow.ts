import { z } from 'zod';
import { AiGenerateText, AiMessageDocument } from '@loopstack/ai-module';
import { BlockConfig, Document, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateDocument } from '@loopstack/core-ui-module';

@BlockConfig({
  configFile: __dirname + '/chat.workflow.yaml',
})
@WithState(
  z.object({
    llmResponse: z.any(),
  }),
)
export class ChatWorkflow extends WorkflowBase {
  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateText: AiGenerateText;
  @Document() aiMessageDocument: AiMessageDocument;
}
