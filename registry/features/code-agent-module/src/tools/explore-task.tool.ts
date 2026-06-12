import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const EXPLORE_SYSTEM_PROMPT = `You are a codebase exploration agent. Your job is to search and read
source code to answer the user's question thoroughly.

Strategy:
1. Start with glob to find relevant files by pattern
2. Use grep to search for specific code patterns across files
3. Use read to inspect file contents in detail
4. Iterate until you have enough information
5. Respond with a clear, structured summary of your findings

Be thorough but efficient. Don't read entire files when grep
can pinpoint the relevant sections.`;

const ExploreTaskInputSchema = z
  .object({
    instructions: z.string().describe('Detailed instructions for what to explore in the codebase'),
  })
  .strict();

type ExploreTaskInput = z.infer<typeof ExploreTaskInputSchema>;

export type ExploreTaskResult = { workflowId: string } | string | Record<string, unknown>;

@Tool({
  name: 'explore_task',
  description:
    'Launch a sub-agent to explore and analyze the codebase. ' +
    'The agent will use glob, grep, and read tools to search for files and code patterns, ' +
    'then return a synthesized summary. Use this when you need to understand existing code ' +
    'patterns, find specific implementations, or gather context before making changes. ' +
    'IMPORTANT: This must be the only tool call in your response.',
  schema: ExploreTaskInputSchema,
})
export class ExploreTask extends BaseTool<ExploreTaskInput, object, ExploreTaskResult> {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  private readonly tools = ['glob', 'grep', 'read'];

  protected async handle(
    args: ExploreTaskInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult<ExploreTaskResult>> {
    const result = await this.agentWorkflow.run(
      {
        system: EXPLORE_SYSTEM_PROMPT,
        tools: this.tools,
        userMessage: args.instructions,
      },
      { callback: options?.callback, show: 'inline', label: 'Exploring...' },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult<ExploreTaskResult>> {
    const data = result as { workflowId?: string; data?: { response?: string } };
    return { data: data.data?.response ?? result };
  }
}
