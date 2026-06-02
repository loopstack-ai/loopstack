import { Inject } from '@nestjs/common';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore } from '@loopstack/common';
import { DOCUMENT_STORE } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 4: Config passed through a wrapper module (GreeterAgentModule.forFeature).
 * Demonstrates the nested forFeature pattern like AgentModule.forFeature → LlmProviderModule.forFeature.
 */
@Workflow({ name: 'nested_greeting', title: 'Nested Greeting' })
export class NestedGreetingWorkflow extends BaseWorkflow {
  constructor(
    private readonly greeter: GreeterTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'done' })
  async greet(state: Record<string, unknown>): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Mundo' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[Nested/Spanish] ${result.data!.message}`,
    });
    return {};
  }

  @Transition({ from: 'done', to: 'end' })
  async finish(state: Record<string, unknown>): Promise<unknown> {
    return {};
  }
}
