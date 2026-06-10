import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const AgentFinishInputSchema = z
  .object({
    result: z.unknown().optional().describe('The final result to return from the agent.'),
  })
  .strict();

type AgentFinishInput = z.infer<typeof AgentFinishInputSchema>;

export type AgentFinishResult = { __agentFinish: true; result: unknown };

@Tool({
  name: 'agent_finish',
  description:
    'Call this tool when you have completed the task and are ready to return the final result. ' +
    'Pass the result as a structured object or string. ' +
    'IMPORTANT: This must be the only tool call in your response.',
  schema: AgentFinishInputSchema,
})
export class AgentFinishTool extends BaseTool<AgentFinishInput, object, AgentFinishResult> {
  protected async handle(args: AgentFinishInput, _ctx: RunContext): Promise<ToolResult<AgentFinishResult>> {
    return Promise.resolve({ data: { __agentFinish: true, result: args.result ?? null } });
  }
}
