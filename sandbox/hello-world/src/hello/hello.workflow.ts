import { z } from 'zod';
import {
  BaseWorkflow,
  Final,
  Initial,
  MessageDocument,
  Transition,
  Workflow,
} from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/hello.ui.yaml',
  schema: z.object({
    name: z.string().default('World'),
  }),
})
export class HelloWorkflow extends BaseWorkflow<{ name: string }> {
  private name: string;

  @Initial({ to: 'ready' })
  async start(args: { name: string }) {
    this.name = args.name;
    return Promise.resolve();
  }

  @Transition({ from: 'ready', to: 'done' })
  async greet() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Hello, ${this.name}!`,
    });
  }

  @Final({ from: 'done' })
  async finish() {
    return Promise.resolve(console.log('Workflow finished'));
  }
}
