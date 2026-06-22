import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, MessageDocument, Transition, type TransitionInput, Workflow } from '@loopstack/common';

const AgentResponseSchema = z.object({ response: z.string() });

@Workflow({
  title: 'Agent Example',
  description: 'Launches a generic agent sub-workflow with weather and calculator tools.',
})
export class AgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start(_state: Record<string, unknown>) {
    await this.agentWorkflow.run(
      {
        system: this.render(__dirname + '/templates/system.md'),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Agent working...' },
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
  }
}
