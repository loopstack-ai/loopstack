import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import { Injectable } from '@nestjs/common';
import { PromptWorkflow } from './prompt-example/prompt.workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'Examples Workspace'
  },
})
export class ExampleWorkspace extends WorkspaceBase {
  // ChatWorkflow,
  // PromptStructuredDataWorkflow,
  // ToolCallWorkflow,
  // MeetingNotesWorkflow,

  @Workflow() private promptWorkflow: PromptWorkflow
}