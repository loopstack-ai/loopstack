import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { McpModule } from '@loopstack/mcp';
import { LinearExampleWorkflow } from './workflows/linear/linear-example.workflow';

@StudioApp({
  title: 'MCP Examples',
  workflows: [LinearExampleWorkflow],
})
@Module({
  imports: [
    AgentModule,
    ClaudeModule,
    // The only MCP configuration the example needs: which hosts the tools may reach, and which env var
    // holds each host's auth header. `forRoot` is global, so it applies to every MCP tool call in the app.
    McpModule.forRoot({
      allowedHosts: ['mcp.linear.app'],
      hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
    }),
  ],
  providers: [LinearExampleWorkflow],
  exports: [LinearExampleWorkflow],
})
export class McpExamplesModule {}
