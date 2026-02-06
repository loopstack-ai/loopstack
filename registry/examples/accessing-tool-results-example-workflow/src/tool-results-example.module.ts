import { Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CreateValueToolModule } from '@loopstack/create-value-tool';
import { WorkflowToolResultsWorkflow } from './workflow-tool-results.workflow';

@Module({
  imports: [CoreUiModule, CreateValueToolModule, CreateChatMessageToolModule],
  providers: [WorkflowToolResultsWorkflow],
  exports: [WorkflowToolResultsWorkflow],
})
export class ToolResultsExampleModule {}
