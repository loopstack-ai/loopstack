import { join } from 'node:path';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

@Workflow({
  title: 'Agent - Chat Agent Example',
  description:
    'Launches a ChatAgentWorkflow with weather and calculator tools. After each answer the agent waits for the next user message.',
})
export class ChatAgentExampleWorkflow extends BaseWorkflow {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  // Without `taskMode` the chat agent never ends on its own, so the parent names no `onSuccess` transition.
  @Transition({ to: 'chatting' })
  async start() {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: ['weather_lookup', 'calculator'],
        userMessage: "What's the weather in Tokyo?",
      },
      { show: 'inline', label: 'Chat Agent' },
    );
  }
}
