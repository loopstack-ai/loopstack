import { WorkflowBase } from '@loopstack/core';
import { BlockConfig, Document, Helper, Tool, WithState } from '@loopstack/common';
import { z } from 'zod';
import { CreateDocument } from '@loopstack/core-ui-module';
import { AiGenerateText, AiMessageDocument, DelegateToolCall } from '@loopstack/ai-module';
import { GetWeather } from './tools/get-weather.tool';

@BlockConfig({
  configFile: __dirname + '/tool-call.workflow.yaml',
})
@WithState(z.object({
  llmResponse: z.any(),
  toolCallResult: z.any(),
}))
export class ToolCallWorkflow extends WorkflowBase  {
  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateText: AiGenerateText;
  @Tool() delegateToolCall: DelegateToolCall;
  @Tool() getWeather: GetWeather;
  @Document() aiMessageDocument: AiMessageDocument;

  @Helper()
  isToolCall(message: any) {
    return message?.parts.some((part: any) => part.type.startsWith('tool-'));
  }
}