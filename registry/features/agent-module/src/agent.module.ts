import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { AgentFinishTool } from './tools/agent-finish.tool';
import { AgentWorkflow } from './workflows/agent.workflow';
import { ChatAgentWorkflow } from './workflows/chat-agent.workflow';

@Module({
  imports: [LlmProviderModule],
  providers: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
  exports: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
})
export class AgentModule {}
