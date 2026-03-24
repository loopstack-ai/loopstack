import { Injectable } from '@nestjs/common';
import { InjectDocument, InjectTool, Runtime, ToolResult, Workflow } from '@loopstack/common';
import { TransitionPayload } from '@loopstack/contracts/dist/schemas';
import type { ScheduledTask } from '@loopstack/contracts/dist/types';
import { CreateDocument, ExecuteWorkflowAsync, LinkDocument } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/run-sub-workflow-example-parent.workflow.yaml',
})
export class RunSubWorkflowExampleParentWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private executeWorkflowAsync: ExecuteWorkflowAsync;
  @InjectTool() private createDocument: CreateDocument;

  @InjectDocument() private linkDocument: LinkDocument;

  @Runtime()
  runtime: {
    tools: Record<'run_workflow', Record<'execute', ToolResult<ScheduledTask>>>;
    transition: TransitionPayload;
  };
}
