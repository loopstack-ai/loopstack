import { BaseWorkflow, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { Inject } from '@nestjs/common';
import { DOCUMENT_STORE } from '@loopstack/common';
import { GreeterTool } from '../greeter/index.js';

/**
 * Scenario 4: Config passed through a wrapper module (GreeterAgentModule.forFeature).
 * Demonstrates the nested forFeature pattern like AgentModule.forFeature → LlmProviderModule.forFeature.
 */
@Workflow({ name: 'nested_greeting' })
export class NestedGreetingWorkflow extends BaseWorkflow {
  constructor(
    private readonly greeter: GreeterTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'done' })
  async greet(ctx: WorkflowContext): Promise<unknown> {
    const result = await this.greeter.call({ name: 'Mundo' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `[Nested/Spanish] ${result.data!.message}`,
    });
    return {};
  }

  @Final({ from: 'done' })
  async finish(): Promise<unknown> {
    return {};
  }
}
