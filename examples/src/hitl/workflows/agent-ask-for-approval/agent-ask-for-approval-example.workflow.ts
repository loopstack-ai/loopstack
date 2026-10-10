import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MarkdownDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const SYSTEM_PROMPT = `You are a release-notes drafting assistant.

Your task: produce a concise release-notes markdown draft, get explicit user approval via the "ask_for_approval" tool, then output the approved markdown as your final response.

CRITICAL RULES — your response MUST follow these:
- First turn: respond with exactly ONE tool call to "ask_for_approval". The "concept" argument IS the markdown draft. Do NOT write the draft as plain text in this turn.
- After approval: your final text response MUST be the approved markdown verbatim, with no preamble, commentary, or trailing text.
- After denial: respond with a brief one-line note that the draft was rejected.`;

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
  async start() {
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
    schema: AgentResultSchema,
  })
  async agentComplete(_state: Record<string, unknown>, input: TransitionInput<AgentResult>) {
    await this.documentStore.save(MarkdownDocument, { markdown: input.data.response });
    this.setResult(input.data);
  }
}
