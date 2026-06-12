import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 3: forFeature override with French config.
 * Runs alongside GermanGreetingWorkflow to prove per-module isolation.
 */
@Workflow({ name: 'french_greeting', title: 'French Greeting' })
export class FrenchGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet(_state: Record<string, unknown>): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Monde' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `[French] ${result.data!.message}`,
    });
    return {};
  }

  @Transition({ from: 'done', to: 'end' })
  async finish(_state: Record<string, unknown>): Promise<unknown> {
    return {};
  }
}
