import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { CodeAgentModule } from '@loopstack/code-agent';
import { StudioApp } from '@loopstack/common';
import { McpModule } from '@loopstack/mcp-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { CalculatorTool } from './tools/calculator.tool';
import { WeatherLookupTool } from './tools/weather-lookup.tool';
import { AgentErrorHandlingFailingSubWorkflow } from './workflows/agent-error-handling/agent-error-handling-failing-sub.workflow';
import { AgentErrorHandlingWorkflow } from './workflows/agent-error-handling/agent-error-handling.workflow';
import { FailingSubWorkflowTool } from './workflows/agent-error-handling/tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './workflows/agent-error-handling/tools/runtime-error.tool';
import { StrictSchemaTool } from './workflows/agent-error-handling/tools/strict-schema.tool';
import { AgentExampleWorkflow } from './workflows/agent/agent-example.workflow';
import { CodeAgentExampleWorkflow } from './workflows/code-agent/code-agent-example.workflow';
import { CustomAgentExampleWorkflow } from './workflows/custom-agent/custom-agent-example.workflow';
import { McpLinearExampleWorkflow } from './workflows/mcp-linear/mcp-linear-example.workflow';

const WORKFLOWS = [
  AgentExampleWorkflow,
  CodeAgentExampleWorkflow,
  McpLinearExampleWorkflow,
  CustomAgentExampleWorkflow,
  AgentErrorHandlingWorkflow,
];

@StudioApp({
  title: 'Agent Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    AgentModule,
    CodeAgentModule,
    ClaudeModule,
    McpModule.forRoot({
      allowedHosts: ['mcp.linear.app'],
      hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' } },
    }),
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),
  ],
  providers: [
    CalculatorTool,
    WeatherLookupTool,
    StrictSchemaTool,
    RuntimeErrorTool,
    FailingSubWorkflowTool,
    AgentErrorHandlingFailingSubWorkflow,
    ...WORKFLOWS,
  ],
  exports: WORKFLOWS,
})
export class AgentExamplesModule {}
