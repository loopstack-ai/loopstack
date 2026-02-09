import { Injectable } from '@nestjs/common';
import { AiGenerateText, AiMessageDocument, AiMessageDocumentContentType } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, Runtime, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';

@Injectable()
@Workflow({
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectDocument() aiMessageDocument: AiMessageDocument;

  @Runtime()
  runtime: {
    tools: Record<'prompt', Record<'llm_call', AiMessageDocumentContentType>>;
  };
}
