import { z } from 'zod';
import { AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, CallbackSchema, MessageDocument, Transition, Workflow } from '@loopstack/common';

const AgentCallbackSchema = CallbackSchema.extend({
  data: z.object({ response: z.string() }),
});

type AgentCallback = z.infer<typeof AgentCallbackSchema>;

@Workflow({
  title: 'Agent Example',
  description: 'Launches a generic agent sub-workflow with weather and calculator tools.',
})
export class AgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.agentWorkflow.run(
      {
        system: this.render(__dirname + '/templates/system.md'),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Agent working...' },
    );
    return state;
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentCallbackSchema,
  })
  async agentComplete(state: Record<string, unknown>, payload: AgentCallback): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: payload.data.response,
    });
    return {};
  }
}
