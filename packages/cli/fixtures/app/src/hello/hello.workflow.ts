import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const InputSchema = z.object({
  name: z.string().default('World'),
});

type InputArgs = z.infer<typeof InputSchema>;

@Workflow({
  title: 'Hello World',
  description: 'Greets you by name — replace this with your first real workflow.',
  schema: InputSchema,
})
export class HelloWorkflow extends BaseWorkflow<InputArgs> {
  @Transition({ from: 'start', to: 'end' })
  async greet(_state: unknown, ctx: RunContext<InputArgs>) {
    const greeting = `Hello, ${ctx.args.name}! 👋`;

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: greeting,
    });

    this.assignResult({ greeting });
  }
}
