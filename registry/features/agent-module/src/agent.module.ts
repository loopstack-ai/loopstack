import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { AgentFinishTool } from './tools/agent-finish.tool.js';
import { AgentWorkflow } from './workflows/agent.workflow.js';
import { ChatAgentWorkflow } from './workflows/chat-agent.workflow.js';

@Module({
  imports: [LlmProviderModule],
  providers: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
  exports: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
})
export class AgentModule {}
