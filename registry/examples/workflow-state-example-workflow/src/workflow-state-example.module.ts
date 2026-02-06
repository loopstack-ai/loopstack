import { Module } from '@nestjs/common';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValueToolModule } from '@loopstack/create-value-tool';
import { WorkflowStateWorkflow } from './workflow-state.workflow';

@Module({
  imports: [CreateValueToolModule, CreateChatMessageToolModule],
  providers: [WorkflowStateWorkflow],
  exports: [WorkflowStateWorkflow],
})
export class WorkflowStateExampleModule {}
