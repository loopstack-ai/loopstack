import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { AgentWorkflow } from './workflows/agent.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [AgentWorkflow],
  exports: [AgentWorkflow],
})
export class AgentModule {}
