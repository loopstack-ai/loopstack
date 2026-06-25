import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { McpCallTool, McpListToolsTool } from '@loopstack/mcp-module';

const LINEAR_MCP_URL = 'https://mcp.linear.app/mcp';

const McpLinearExampleArgsSchema = z.object({
  initialMessage: z
    .string()
    .optional()
    .default(
      'List the available Linear MCP tools, then fetch my active issues and summarize the top 5 by priority with assignee and status.',
    )
    .describe('Initial message shown to the agent.'),
});

type McpLinearExampleArgs = z.infer<typeof McpLinearExampleArgsSchema>;

@Workflow({
  title: 'Agent - MCP Linear Example',
  description: "Chat agent connected to Linear's hosted MCP server. Demonstrates MCP tool integration.",
  schema: McpLinearExampleArgsSchema,
})
export class McpLinearExampleWorkflow extends BaseWorkflow<McpLinearExampleArgs> {
  constructor(
    private readonly chatAgentWorkflow: ChatAgentWorkflow,
    private readonly mcpListTools: McpListToolsTool,
    private readonly mcpCallTool: McpCallTool,
  ) {
    super();
  }

  @Transition({ to: 'chatting' })
  async startChat(state: Record<string, unknown>, ctx: RunContext<McpLinearExampleArgs>) {
    const systemPrompt = [
      `You are a Linear assistant connected via MCP at ${LINEAR_MCP_URL} (transport: streamableHttp).`,
      'Use `mcpListTools` to discover the available Linear tools, then `mcpCallTool` to invoke them.',
      `Always pass serverUrl="${LINEAR_MCP_URL}" and transport="streamableHttp".`,
    ].join('\n');

    await this.chatAgentWorkflow.run(
      {
        system: systemPrompt,
        tools: ['mcp_list_tools', 'mcp_call'],
        userMessage: ctx.args.initialMessage,
      },
      { show: 'inline', label: 'Linear Agent Chat' },
    );
  }
}
