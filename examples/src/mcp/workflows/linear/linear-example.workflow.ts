import { join } from 'node:path';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const LinearExampleArgsSchema = z.object({
  initialMessage: z
    .string()
    .optional()
    .default(
      'List the available Linear MCP tools, then fetch my active issues and summarize the top 5 by priority with assignee and status.',
    )
    .describe('Initial message shown to the agent.'),
});

type LinearExampleArgs = z.infer<typeof LinearExampleArgsSchema>;

@Workflow({
  title: 'MCP - Linear Example',
  description:
    "Chat agent with the mcp_list_tools and mcp_call tools, connected to Linear's hosted MCP server. The allowed host and the auth header come from McpModule.forRoot in the module.",
  schema: LinearExampleArgsSchema,
})
export class LinearExampleWorkflow extends BaseWorkflow<LinearExampleArgs> {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  @Transition({ to: 'chatting' })
  async startChat(_state: Record<string, unknown>, ctx: RunContext<LinearExampleArgs>) {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['mcp_list_tools', 'mcp_call'],
        userMessage: ctx.args.initialMessage,
      },
      { show: 'inline', label: 'Linear Agent Chat' },
    );
  }
}
