import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateValueToolModule } from '@loopstack/create-value-tool';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { WorkflowStateWorkflow } from './workflow-state.workflow';

@Module({
  imports: [LoopCoreModule, CreateValueToolModule, CreateChatMessageToolModule],
  providers: [
    WorkflowStateWorkflow,
  ],
  exports: [
    WorkflowStateWorkflow,
  ]
})
export class WorkflowStateExampleModule {}
