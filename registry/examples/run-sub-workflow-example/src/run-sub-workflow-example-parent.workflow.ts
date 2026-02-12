import { Injectable } from '@nestjs/common';
import { InjectDocument, InjectTool, Workflow } from '@loopstack/common';
import { ExecuteWorkflowAsync } from '@loopstack/core';
import { CreateDocument, LinkDocument } from '@loopstack/core-ui-module';
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
}
