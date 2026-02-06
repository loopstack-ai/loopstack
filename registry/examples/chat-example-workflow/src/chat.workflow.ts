import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiGenerateText, AiMessageDocument } from '@loopstack/ai-module';
import { InjectDocument, InjectTool, WithState, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core-ui-module';

@Injectable()
@Workflow({
  configFile: __dirname + '/chat.workflow.yaml',
})
@WithState(
  z.object({
    llmResponse: z.any(),
  }),
)
export class ChatWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectDocument() aiMessageDocument: AiMessageDocument;
}
