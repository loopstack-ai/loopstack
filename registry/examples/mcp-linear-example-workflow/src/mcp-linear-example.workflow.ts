import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  Initial,
  LinkDocument,
  MessageDocument,
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
    .default('Hi! I can help you with Linear via MCP — what would you like to do?')
    .describe('Initial message shown to the agent.'),
});

type McpLinearExampleArgs = z.infer<typeof McpLinearExampleArgsSchema>;

interface McpLinearState {}

@Workflow({
  title: 'MCP Linear',
  uiConfig: __dirname + '/mcp-linear-example.ui.yaml',
  schema: McpLinearExampleArgsSchema,
})
export class McpLinearExampleWorkflow extends BaseWorkflow<McpLinearExampleArgs, McpLinearState> {
  constructor(
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
    private readonly mcpListTools: McpListToolsTool,
    private readonly mcpCallTool: McpCallTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'chatting' })
  async startChat(ctx: WorkflowContext, args: McpLinearExampleArgs, state: McpLinearState): Promise<McpLinearState> {
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
