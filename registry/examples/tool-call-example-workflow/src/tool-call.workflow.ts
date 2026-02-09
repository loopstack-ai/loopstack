import {
  AiGenerateText,
  AiMessageDocument,
  AiMessageDocumentContentType,
  DelegateToolCall,
} from '@loopstack/ai-module';
import { DefineHelper, InjectDocument, InjectTool, Runtime, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';
import { GetWeather } from './tools/get-weather.tool';

@Workflow({
  configFile: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectTool() delegateToolCall: DelegateToolCall;
  @InjectTool() getWeather: GetWeather;
  @InjectDocument() aiMessageDocument: AiMessageDocument;

  @DefineHelper()
  isToolCall(message: { parts?: { type: string }[] } | null | undefined): boolean {
    return message?.parts?.some((part) => part.type.startsWith('tool-')) ?? false;
  }

  @Runtime()
  runtime: {
    tools: {
      llm_turn: {
        llm_call: AiMessageDocumentContentType;
      };
      route_with_tool_calls: {
        delegate: AiMessageDocumentContentType;
      };
    };
  };
}
