import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import {
  LlmGenerateTextTool,
  LlmMessageDocument,
} from '@loopstack/llm-provider-module';

const InputSchema = z.object({
  name: z.string().default('World'),
});

type InputArgs = z.infer<typeof InputSchema>;

@Workflow({
  title: 'Hello World',
  description: 'A simple workflow that greets you by name using an LLM.',
  schema: InputSchema,
})
export class HelloWorkflow extends BaseWorkflow<InputArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ from: 'start', to: 'message_received' })
  async greet(_state: unknown, ctx: RunContext<InputArgs>) {
    await this.llmGenerateText.call({
      prompt: `Say hello to ${ctx.args.name} in a fun way in one sentence.`,
    });
  }

  @Transition({ from: 'message_received', to: 'end' })
  async saveMessage() {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: 'Bye.',
    });
  }
}
