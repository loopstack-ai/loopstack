import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 4: Config passed through a wrapper module (GreeterAgentModule.forFeature).
 * Demonstrates the nested forFeature pattern like AgentModule.forFeature → LlmProviderModule.forFeature.
 */
@Workflow({ name: 'nested_greeting', title: 'Nested Greeting' })
export class NestedGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet(_state: Record<string, unknown>) {
    const result = await this.greeter.call({ name: 'Mundo' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `[Nested/Spanish] ${result.data.message}`,
    });
  }

  @Transition({ from: 'done', to: 'end' })
  finish(_state: Record<string, unknown>) {}
}
