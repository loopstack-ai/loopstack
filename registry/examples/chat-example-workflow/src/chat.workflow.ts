import { ClaudeGenerateText, ClaudeMessageDocument } from '@loopstack/claude-module';
import { InjectDocument, InjectTool, Runtime, State, Workflow } from '@loopstack/common';
import { CreateDocument } from '@loopstack/core';

@Workflow({
  configFile: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow {
  @InjectTool() createDocument: CreateDocument;
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;

  @State({
    schema: undefined,
  })
  state: {
    llmResult?: any;
  };

  @Runtime()
  runtime: any;
}
