import { BaseWorkflow, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { Inject } from '@nestjs/common';
import { DOCUMENT_STORE } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 2: forFeature override with German config.
 */
@Workflow({ name: 'german_greeting' })
export class GermanGreetingWorkflow extends BaseWorkflow {
  constructor(
    private readonly greeter: GreeterTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'done' })
  async greet(ctx: WorkflowContext): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Welt' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[German] ${result.data!.message}`,
    });
    return {};
  }

  @Final({ from: 'done' })
  async finish(): Promise<unknown> {
    return {};
  }
}
