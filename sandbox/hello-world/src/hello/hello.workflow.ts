import { z } from 'zod';
import {
  BaseWorkflow,
  Final,
  Initial,
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
  title: 'Greeting',
  description: 'A simple greeting workflow.',
  uiConfig: __dirname + '/hello.ui.yaml',
  schema: z.object({
    name: z.string().default('World'),
  }),
})
export class HelloWorkflow extends BaseWorkflow<{ name: string }, HelloState> {
  constructor(private readonly documentStore: DocumentStore) {
    super();
  }

  @Initial({ to: 'ready' })
  async start(
    ctx: WorkflowContext,
    args: { name: string },
    state: HelloState,
  ): Promise<HelloState> {
    return { name: args.name };
  }

  @Transition({ from: 'ready', to: 'done' })
  async greet(ctx: WorkflowContext, state: HelloState): Promise<HelloState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Hello, ${state.name}!`,
    });
    return state;
  }

  @Final({ from: 'done' })
  async finish(ctx: WorkflowContext, state: HelloState): Promise<unknown> {
    return {};
  }
}
