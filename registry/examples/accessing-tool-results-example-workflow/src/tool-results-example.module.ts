import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValueToolModule } from '@loopstack/create-value-tool';
import { WorkflowToolResultsWorkflow } from './workflow-tool-results.workflow';

@Module({
  imports: [LoopCoreModule, CreateValueToolModule, CreateChatMessageToolModule],
  providers: [WorkflowToolResultsWorkflow],
  exports: [WorkflowToolResultsWorkflow],
})
export class ToolResultsExampleModule {}
