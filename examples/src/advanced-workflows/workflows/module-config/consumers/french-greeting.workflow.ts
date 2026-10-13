import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 2: forFeature override with French config.
 */
@Workflow({ name: 'french_greeting', title: 'Advanced - Module Config (French)' })
export class FrenchGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet() {
    const result = await this.greeter.call({ name: 'Monde' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `[French] ${result.data.message}`,
    });
  }

  @Transition({ from: 'done', to: 'end' })
  finish() {}
}
