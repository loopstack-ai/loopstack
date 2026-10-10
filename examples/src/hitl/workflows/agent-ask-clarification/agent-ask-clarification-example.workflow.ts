import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const SYSTEM_PROMPT = `You are a trip-planning assistant.

CRITICAL RULES — your response MUST follow these:
- Before recommending a destination, you MUST know BOTH the user's budget AND their preferred climate.
- If EITHER is missing from the conversation, your response MUST be exactly ONE tool call to "ask_clarification".
- Do NOT guess. Do NOT recommend a destination based on partial info.
- Only after you have received BOTH pieces of information, recommend a single destination as a short paragraph.`;

@Workflow({
  title: 'HITL - Agent Ask Clarification Example',
  description:
    'Agent HITL: an LLM agent runs with the ask_clarification tool. When it lacks information, ' +
    'it pauses the loop and prompts the user; the answer flows back into the agent context.',
})
export class AgentAskClarificationExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start() {
    await this.agentWorkflow.run(
      {
        system: SYSTEM_PROMPT,
        tools: ['ask_clarification'],
        userMessage: 'Where should I go on holiday next month?',
      },
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Trip planner working...' },
    );
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentResultSchema,
  })
  async agentComplete(_state: Record<string, unknown>, input: TransitionInput<AgentResult>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
    this.setResult(input.data);
  }
}
