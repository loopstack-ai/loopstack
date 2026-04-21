import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseTool, InjectWorkflow, LinkDocument, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';

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

@Tool({
  uiConfig: {
    description:
      'Launch a sub-agent to explore and analyze the codebase. ' +
      'The agent will use glob, grep, and read tools to search for files and code patterns, ' +
      'then return a synthesized summary. Use this when you need to understand existing code ' +
      'patterns, find specific implementations, or gather context before making changes. ' +
      'IMPORTANT: This must be the only tool call in your response.',
  },
  schema: ExploreTaskInputSchema,
})
export class ExploreTask extends BaseTool {
  @InjectWorkflow() private agent: AgentWorkflow;

  async call(args: ExploreTaskInput, options?: ToolCallOptions): Promise<ToolResult> {
    const result = await this.agent.run(
      {
        system: EXPLORE_SYSTEM_PROMPT,
        tools: ['glob', 'grep', 'read'],
        userMessage: args.instructions,
      },
      { alias: 'exploreAgent', callback: options?.callback },
    );

    const workflowId = result.workflowId;

    await this.repository.save(
      LinkDocument,
      { status: 'pending', label: 'Exploring...', workflowId, embed: true, expanded: true },
      { id: 'explore_link' },
    );

    return {
      data: { workflowId },
      pending: { workflowId },
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string; data?: { response?: string } };

    await this.repository.save(
      LinkDocument,
      { status: 'success', label: 'Exploring complete', workflowId: data.workflowId! },
      { id: 'explore_link' },
    );

    return { data: data.data?.response ?? result };
  }
}
