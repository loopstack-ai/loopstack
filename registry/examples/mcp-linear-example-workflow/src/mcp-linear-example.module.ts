import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { LoopCoreModule } from '@loopstack/core';
import { McpModule } from '@loopstack/mcp-module';
import { McpLinearExampleWorkflow } from './mcp-linear-example.workflow';

@Module({
  imports: [LoopCoreModule, McpModule, AgentModule],
  providers: [McpLinearExampleWorkflow],
  exports: [McpLinearExampleWorkflow],
})
export class McpLinearExampleModule {}
