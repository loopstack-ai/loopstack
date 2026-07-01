import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

const AgentFinishInputSchema = z
  .object({
    result: z.unknown().optional().describe('The final result to return from the agent.'),
  })
  .strict();

type AgentFinishInput = z.infer<typeof AgentFinishInputSchema>;

/**
 * Result returned by `AgentFinishTool` — a sentinel marking agent completion with
 * the final `result`.
 *
 * @public
 */
export type AgentFinishResult = { __agentFinish: true; result: unknown };

/**
 * Tool that signals the agent has completed its task and returns the final result.
 *
 * The LLM calls this to end the loop, passing the final `result` as a structured object
 * or string. Returns an {@link AgentFinishResult} the agent workflow uses to exit.
 *
 * @providedBy AgentModule
 * @public
 */
@Tool({
  name: 'agent_finish',
  description:
    'Call this tool when you have completed the task and are ready to return the final result. ' +
    'Pass the result as a structured object or string. ' +
    'IMPORTANT: This must be the only tool call in your response.',
  schema: AgentFinishInputSchema,
})
export class AgentFinishTool extends BaseTool<AgentFinishInput, object, AgentFinishResult> {
  protected async handle(args: AgentFinishInput): Promise<ToolEnvelope<AgentFinishResult>> {
    return Promise.resolve({ data: { __agentFinish: true, result: args.result ?? null } });
  }
}
