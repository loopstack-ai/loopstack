import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 2: forFeature override with German config.
 */
@Workflow({ name: 'german_greeting', title: 'German Greeting' })
export class GermanGreetingWorkflow extends BaseWorkflow {
  constructor(private readonly greeter: GreeterTool) {
    super();
  }

  @Transition({ to: 'done' })
  async greet(_state: Record<string, unknown>): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Welt' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[German] ${result.data!.message}`,
    });
    return {};
  }

  @Transition({ from: 'done', to: 'end' })
  async finish(_state: Record<string, unknown>): Promise<unknown> {
    return {};
  }
}
