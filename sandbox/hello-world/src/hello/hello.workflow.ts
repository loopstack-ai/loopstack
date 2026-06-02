import { z } from 'zod';
import {
  BaseWorkflow,
  MessageDocument,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';

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
  @Transition({ to: 'ready' })
  start(state: HelloState, ctx: LoopstackContext): HelloState {
    const args = ctx.args as { name: string };
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
  finish(): unknown {
    return {};
  }
}
