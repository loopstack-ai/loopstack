import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  Initial,
  InjectTool,
  InjectWorkflow,
  LinkDocument,
  MessageDocument,
  Workflow,
} from '@loopstack/common';
import { McpCallTool, McpListToolsTool } from '@loopstack/mcp-module';

const LINEAR_MCP_URL = 'https://mcp.linear.app/mcp';

const McpLinearExampleArgsSchema = z.object({
  initialMessage: z
    .string()
    .optional()
    .default('Hi! I can help you with Linear via MCP — what would you like to do?')
    .describe('Initial message shown to the agent.'),
});

type McpLinearExampleArgs = z.infer<typeof McpLinearExampleArgsSchema>;

@Workflow({
  uiConfig: __dirname + '/mcp-linear-example.ui.yaml',
  schema: McpLinearExampleArgsSchema,
})
export class McpLinearExampleWorkflow extends BaseWorkflow<McpLinearExampleArgs> {
  @InjectWorkflow({ model: 'claude-sonnet-4-6' })
  private readonly agent: ChatAgentWorkflow;

  @InjectTool({
    allowedHosts: ['mcp.linear.app'],
    hostHeaderEnv: {
      'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
    },
  })
  private readonly mcpListTools: McpListToolsTool;

  @InjectTool({
    allowedHosts: ['mcp.linear.app'],
    hostHeaderEnv: {
      'mcp.linear.app': { Authorization: 'LINEAR_MCP_TOKEN' },
    },
  })
  private readonly mcpCallTool: McpCallTool;

  @Initial({ to: 'chatting' })
  async startChat(args: McpLinearExampleArgs) {
    const systemPrompt = [
      `You are a Linear assistant connected via MCP at ${LINEAR_MCP_URL} (transport: streamableHttp).`,
      'Use `mcpListTools` to discover the available Linear tools, then `mcpCallTool` to invoke them.',
      `Always pass serverUrl="${LINEAR_MCP_URL}" and transport="streamableHttp".`,
    ].join('\n');

    const result = await this.agent.run(
      {
        system: systemPrompt,
        tools: ['mcpListTools', 'mcpCallTool'],
        userMessage: args.initialMessage,
      },
      { alias: 'agent' },
    );

    await this.repository.save(LinkDocument, {
      workflowId: result.workflowId,
      label: 'Linear Agent Chat',
      status: 'pending',
      embed: true,
      expanded: true,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Connected to Linear MCP at ${LINEAR_MCP_URL}.`,
    });
  }
}
