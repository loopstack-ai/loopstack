import { z } from 'zod';
import { BaseTool, InjectWorkflow, LinkDocument, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { ExploreAgentWorkflow } from '../workflows/explore-agent.workflow';

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
  @InjectWorkflow() private exploreAgent: ExploreAgentWorkflow;

  async call(args: ExploreTaskInput, options?: ToolCallOptions): Promise<ToolResult> {
    const result = await this.exploreAgent.run(
      { instructions: args.instructions },
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
