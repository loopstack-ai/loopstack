import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Tool, WithState } from '@loopstack/common';
import { z } from 'zod';
import { AiGenerateText } from '@loopstack/ai-module';
import { CreateDocument } from '@loopstack/core-ui-module';

@BlockConfig({
  configFile: __dirname + '/chat.workflow.yaml',
})
@WithState(z.object({
  llmResponse: z.any(),
}))
export class ChatWorkflow extends WorkflowBase  {
  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateText: AiGenerateText;
}