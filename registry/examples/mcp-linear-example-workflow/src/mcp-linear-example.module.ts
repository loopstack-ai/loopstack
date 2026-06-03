import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { McpModule } from '@loopstack/mcp-module';
import { McpLinearExampleWorkflow } from './mcp-linear-example.workflow';

@Module({
  imports: [
    McpModule.forRoot({
      allowedHosts: ['mcp.linear.app'],
      hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
    }),
    AgentModule,
  ],
  providers: [McpLinearExampleWorkflow],
  exports: [McpLinearExampleWorkflow],
})
export class McpLinearExampleModule {}
