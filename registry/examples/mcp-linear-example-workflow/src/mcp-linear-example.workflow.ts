import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  LinkDocument,
  MessageDocument,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
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
  title: 'MCP Linear Example',
  description: "Chat with an agent connected to Linear's hosted MCP server.",
  schema: McpLinearExampleArgsSchema,
})
export class McpLinearExampleWorkflow extends BaseWorkflow<McpLinearExampleArgs> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly mcpListTools: McpListToolsTool,
    private readonly mcpCallTool: McpCallTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'chatting' })
  async startChat(state: Record<string, unknown>, ctx: WorkflowContext): Promise<Record<string, unknown>> {
    const args = ctx.input.args as McpLinearExampleArgs;
    const systemPrompt = [
      `You are a Linear assistant connected via MCP at ${LINEAR_MCP_URL} (transport: streamableHttp).`,
      'Use `mcpListTools` to discover the available Linear tools, then `mcpCallTool` to invoke them.',
      `Always pass serverUrl="${LINEAR_MCP_URL}" and transport="streamableHttp".`,
    ].join('\n');

    const result = await this.orchestrator.queue(
      {
        system: systemPrompt,
        tools: ['mcp_list_tools', 'mcp_call'],
        userMessage: args.initialMessage,
      },
      { workflowName: ChatAgentWorkflow.name },
    );

    await this.documentStore.save(LinkDocument, {
      workflowId: result.workflowId,
      label: 'Linear Agent Chat',
      status: 'pending',
      embed: true,
      expanded: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Connected to Linear MCP at ${LINEAR_MCP_URL}.`,
    });
    return state;
  }
}
