import { AiGenerateText, AiMessageDocument, AiMessageDocumentContentType } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, Runtime, ToolResult, Workflow } from '@loopstack/common';
import { TransitionPayload } from '@loopstack/contracts/schemas';
import { CreateDocument } from '@loopstack/core-ui-module';

@Workflow({
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectDocument() aiMessageDocument: AiMessageDocument;

  @Runtime()
  runtime: {
    tools: Record<'prompt', Record<'llm_call', ToolResult<AiMessageDocumentContentType>>>;
    transition: TransitionPayload;
  };
}
