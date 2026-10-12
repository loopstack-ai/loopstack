import { join } from 'node:path';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

/** What the agent passes to `agent_finish` — the run's result. */
const SecretsSummarySchema = z.object({ summary: z.string() });

type SecretsSummary = z.infer<typeof SecretsSummarySchema>;

@Workflow({
  title: 'Secrets - Agentic Example',
  description:
    'Launches a ChatAgentWorkflow with the get_secret_keys and request_secrets_task tools. The agent checks which secrets exist, asks the user for the missing ones through a secure form, and finishes once they are stored.',
})
export class AgenticExampleWorkflow extends BaseWorkflow {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start() {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['get_secret_keys', 'request_secrets_task'],
        userMessage: this.render(join(__dirname, 'templates', 'userMessage.md')),
        taskMode: true,
      },
      { callback: { transition: 'agentFinished' }, show: 'inline', label: 'Secrets Agent' },
    );
  }

  @Transition({ from: 'running', to: 'end', wait: true, schema: SecretsSummarySchema })
  async agentFinished(_state: Record<string, unknown>, input: TransitionInput<SecretsSummary>) {
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: input.data.summary });
    this.setResult(input.data);
  }
}
