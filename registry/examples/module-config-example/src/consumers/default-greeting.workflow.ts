import { Inject } from '@nestjs/common';
import { BaseWorkflow, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { DOCUMENT_STORE } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 1: No forFeature — uses forRoot global defaults.
 */
@Workflow({ name: 'default_greeting', title: 'Default Greeting' })
export class DefaultGreetingWorkflow extends BaseWorkflow {
  constructor(
    private readonly greeter: GreeterTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'done' })
  async greet(ctx: WorkflowContext): Promise<unknown> {
    const result = await this.greeter.call({ name: 'World' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[Default] ${result.data!.message}`,
    });
    return {};
  }

  @Final({ from: 'done' })
  async finish(): Promise<unknown> {
    return {};
  }
}
