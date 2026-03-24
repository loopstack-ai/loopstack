import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example-parent.workflow';
import { RunSubWorkflowExampleSubWorkflow } from './run-sub-workflow-example-sub.workflow';

@Module({
  imports: [LoopCoreModule, CreateChatMessageToolModule],
  providers: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
  exports: [RunSubWorkflowExampleParentWorkflow, RunSubWorkflowExampleSubWorkflow],
})
export class RunSubWorkflowExampleModule {}
