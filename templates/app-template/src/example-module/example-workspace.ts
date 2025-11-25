import { BlockConfig } from '@loopstack/common';
import { Workspace } from '@loopstack/core';
import { PromptWorkflow } from './llm/prompt-example/prompt.workflow';
import { ChatWorkflow } from './llm/chat-example/chat.workflow';
import { PromptStructuredDataWorkflow } from './llm/prompt-structured-data-example/prompt-structured-data.workflow';
import { ToolCallWorkflow } from './llm/tool-call-example/tool-call.workflow';
import { MeetingNotesWorkflow } from './tutorials/meeting-notes-example/meeting-notes.workflow';

@BlockConfig({
  imports: [
    PromptWorkflow,
    ChatWorkflow,
    PromptStructuredDataWorkflow,
    ToolCallWorkflow,
    MeetingNotesWorkflow,
  ],
  config: {
    title: 'Examples Workspace'
  },
})
export class ExampleWorkspace extends Workspace {}