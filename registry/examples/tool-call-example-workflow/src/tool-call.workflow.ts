import { z } from 'zod';
import { AiGenerateText, AiMessageDocument, DelegateToolCall } from '@loopstack/ai-module';
import { BlockConfig, Document, Helper, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateDocument } from '@loopstack/core-ui-module';
import { GetWeather } from './tools/get-weather.tool';

@BlockConfig({
  configFile: __dirname + '/tool-call.workflow.yaml',
})
@WithState(
  z.object({
    llmResponse: z.any(),
    toolCallResult: z.any(),
  }),
)
export class ToolCallWorkflow extends WorkflowBase {
  @Tool() createDocument: CreateDocument;
  @Tool() aiGenerateText: AiGenerateText;
  @Tool() delegateToolCall: DelegateToolCall;
  @Tool() getWeather: GetWeather;
  @Document() aiMessageDocument: AiMessageDocument;

  @Helper()
  isToolCall(message: { parts?: { type: string }[] } | null | undefined): boolean {
    return message?.parts?.some((part) => part.type.startsWith('tool-')) ?? false;
  }
}
