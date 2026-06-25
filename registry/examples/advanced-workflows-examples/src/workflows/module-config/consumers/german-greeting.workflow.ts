import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 2: forFeature override with German config.
 */
@Workflow({ name: 'german_greeting', title: 'Advanced - Module Config (German)' })
export class GermanGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet(_state: Record<string, unknown>) {
    const result = await this.greeter.call({ name: 'Welt' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `[German] ${result.data.message}`,
    });
  }

  @Transition({ from: 'done', to: 'end' })
  finish(_state: Record<string, unknown>) {}
}
