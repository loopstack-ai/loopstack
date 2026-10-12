import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude';
import { CodeAgentModule } from '@loopstack/code-agent';
import { StudioApp } from '@loopstack/common';
import { McpModule } from '@loopstack/mcp';
import { RemoteClientModule } from '@loopstack/remote-client';
import { CalculatorTool } from './tools/calculator.tool';
import { WeatherLookupTool } from './tools/weather-lookup.tool';
import { AgentExampleWorkflow } from './workflows/agent/agent-example.workflow';
import { CodeAgentExampleWorkflow } from './workflows/code-agent/code-agent-example.workflow';
import { CustomAgentExampleWorkflow } from './workflows/custom-agent/custom-agent-example.workflow';
import { McpLinearExampleWorkflow } from './workflows/mcp-linear/mcp-linear-example.workflow';
import { ToolErrorsExampleWorkflow } from './workflows/tool-errors/tool-errors-example.workflow';
import { ToolErrorsFailingSubWorkflow } from './workflows/tool-errors/tool-errors-failing-sub.workflow';
import { FailingSubWorkflowTool } from './workflows/tool-errors/tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from './workflows/tool-errors/tools/runtime-error.tool';
import { StrictSchemaTool } from './workflows/tool-errors/tools/strict-schema.tool';

const WORKFLOWS = [
  AgentExampleWorkflow,
  ToolErrorsExampleWorkflow,
  CodeAgentExampleWorkflow,
  McpLinearExampleWorkflow,
  CustomAgentExampleWorkflow,
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
    ToolErrorsFailingSubWorkflow,
    ...WORKFLOWS,
  ],
  exports: WORKFLOWS,
})
export class AgentExamplesModule {}
