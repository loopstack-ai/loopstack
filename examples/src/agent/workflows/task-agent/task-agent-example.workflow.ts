import { join } from 'node:path';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider';

/** What the agent passes to `agent_finish` — the run's result. */
const WeatherComparisonSchema = z.object({
  warmerCity: z.string(),
  differenceCelsius: z.number(),
});

type WeatherComparison = z.infer<typeof WeatherComparisonSchema>;

@Workflow({
  title: 'Agent - Task Agent Example',
  description:
    'Launches a ChatAgentWorkflow in taskMode with weather and calculator tools. The agent compares two cities and ends the run by calling agent_finish with a structured result.',
})
export class TaskAgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start() {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['weather_lookup', 'calculator'],
        userMessage: 'Which city is warmer right now, London or Tokyo, and by how many degrees?',
        taskMode: true,
      },
      { onSuccess: { transition: 'agentFinished' }, show: 'inline', label: 'Task Agent' },
    );
  }

  @Transition({ from: 'running', to: 'end', wait: true, schema: WeatherComparisonSchema })
  async agentFinished(_state: Record<string, unknown>, input: TransitionInput<WeatherComparison>) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: `${input.data.warmerCity} is warmer by ${input.data.differenceCelsius}°C.`,
    });
    this.setResult(input.data);
  }
}
