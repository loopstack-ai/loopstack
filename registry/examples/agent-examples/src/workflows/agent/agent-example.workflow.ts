import { join } from 'node:path';
import { type AgentResult, AgentResultSchema, AgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  title: 'Agent - Basic Agent Example',
  description:
    'Launches a generic AgentWorkflow as a sub-workflow with weather and calculator tools. Recommended starting point.',
})
export class AgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly agentWorkflow: AgentWorkflow) {
    super();
  }

  @Transition({ to: 'running' })
  async start() {
    await this.agentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo? Also, what is 42 * 17?",
      },
      { callback: { transition: 'agentComplete' }, show: 'inline', label: 'Subagent' },
    );
  }

  @Transition({
    from: 'running',
    to: 'end',
    wait: true,
    schema: AgentResultSchema,
  })
  async agentComplete(_state: Record<string, unknown>, input: TransitionInput<AgentResult>) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: input.data.response,
    });
    this.setResult(input.data);
  }
}
