import { Inject } from '@nestjs/common';
import { BaseWorkflow, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { DOCUMENT_STORE } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 3: forFeature override with French config.
 * Runs alongside GermanGreetingWorkflow to prove per-module isolation.
 */
@Workflow({ name: 'french_greeting', title: 'French Greeting' })
export class FrenchGreetingWorkflow extends BaseWorkflow {
  constructor(
    private readonly greeter: GreeterTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'done' })
  async greet(ctx: WorkflowContext): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Monde' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[French] ${result.data!.message}`,
    });
    return {};
  }

  @Final({ from: 'done' })
  async finish(): Promise<unknown> {
    return {};
  }
}
