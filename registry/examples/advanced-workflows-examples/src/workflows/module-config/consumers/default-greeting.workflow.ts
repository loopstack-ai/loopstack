import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 1: No forFeature — uses forRoot global defaults.
 */
@Workflow({ name: 'default_greeting', title: 'Advanced - Module Config (Default)' })
export class DefaultGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet() {
    const result = await this.greeter.call({ name: 'World' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `[Default] ${result.data.message}`,
    });
  }

  @Transition({ from: 'done', to: 'end' })
  finish() {}
}
