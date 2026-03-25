import { Injectable } from '@nestjs/common';
import { InjectDocument, InjectTool, InjectWorkflow, Runtime, Workflow } from '@loopstack/common';
import { CreateDocument, LinkDocument, Task } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

@Injectable()
@Workflow({
  configFile: __dirname + '/run-sub-workflow-example-parent.workflow.yaml',
})
export class RunSubWorkflowExampleParentWorkflow {
  @InjectTool() private createChatMessage: CreateChatMessage;
  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;

  @InjectDocument() private linkDocument: LinkDocument;

  @InjectWorkflow() private runSubWorkflowExampleSub: RunSubWorkflowExampleSubWorkflow;

  @Runtime()
  runtime: any;
}
