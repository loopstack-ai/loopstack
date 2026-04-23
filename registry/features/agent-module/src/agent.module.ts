import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { AgentFinishTool } from './tools/agent-finish.tool';
import { AgentWorkflow } from './workflows/agent.workflow';
import { ChatAgentWorkflow } from './workflows/chat-agent.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
  exports: [AgentWorkflow, ChatAgentWorkflow, AgentFinishTool],
})
export class AgentModule {}
