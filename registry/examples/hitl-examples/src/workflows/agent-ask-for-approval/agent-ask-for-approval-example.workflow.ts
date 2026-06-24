import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const AgentResponseSchema = z.object({ response: z.string() });

const SYSTEM_PROMPT = `You are a release-notes drafting assistant.

Your task: produce a concise release-notes markdown draft for the user's input, then submit it for explicit user approval.

CRITICAL RULES — your response MUST follow these:
- Do NOT write the draft as plain text in your response.
- Your response MUST be exactly ONE tool call to "ask_for_approval".
- The "concept" argument of the tool call IS the markdown draft.
- Never finish your turn without calling "ask_for_approval".`;

@Workflow({
  title: 'HITL - Agent Ask For Approval Example',
  description:
    'Agent HITL: an LLM agent drafts content, then calls the ask_for_approval tool to show the markdown ' +
    'to the user and pause until they confirm or deny.',
})
export class AgentAskForApprovalExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start(_state: Record<string, unknown>) {
    await this.agentWorkflow.run(
      {
        system: SYSTEM_PROMPT,
        tools: ['ask_for_approval'],
        userMessage:
          'Draft release notes for v1.2.3: added webhook signature verification; fixed a date-parsing bug in the importer.',
      },
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Drafting release notes...' },
    );
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentResponseSchema,
  })
  async agentComplete(state: Record<string, unknown>, input: TransitionInput<{ response: string }>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
    this.setResult({ response: input.data.response } as unknown as Record<string, unknown>);
  }
}
