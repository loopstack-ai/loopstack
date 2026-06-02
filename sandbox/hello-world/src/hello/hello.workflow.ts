import { z } from 'zod';
import {
  BaseWorkflow,
  MessageDocument,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { WorkflowContext } from '@loopstack/common';
import { DocumentStore } from '@loopstack/core';

interface HelloState {
  name?: string;
}

@Workflow({
  title: 'Hello World',
  description: 'A simple workflow that greets you by name.',
  schema: z.object({
    name: z.string().default('World'),
  }),
})
export class HelloWorkflow extends BaseWorkflow<{ name: string }, HelloState> {
  constructor(private readonly documentStore: DocumentStore) {
    super();
  }

  @Transition({ to: 'ready' })
  async start(state: HelloState, ctx: WorkflowContext): Promise<HelloState> {
    const args = ctx.input.args as { name: string };
    return { name: args.name };
  }

  @Transition({ from: 'ready', to: 'done' })
  async greet(state: HelloState): Promise<HelloState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Hello, ${state.name}!`,
    });
    return state;
  }

  @Transition({ from: 'done', to: 'end' })
  async finish(state: HelloState): Promise<unknown> {
    return {};
  }
}
