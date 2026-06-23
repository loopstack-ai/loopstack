import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, DocumentEntity, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

interface PromptStructuredOutputState {
  language?: string;
  llmResult?: DocumentEntity<FileDocumentType>;
}

const PromptStructuredOutputArgsSchema = z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
});

type PromptStructuredOutputArgs = z.infer<typeof PromptStructuredOutputArgsSchema>;

@Workflow({
  title: 'Structured Output Example (Hello World Script)',
  description:
    'An example workflow that demonstrates how to generate a structured output in Loopstack on the example of creating a "Hello, World!" script in a specified programming language.',
  schema: PromptStructuredOutputArgsSchema,
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<PromptStructuredOutputArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'ready' })
  async greeting(state: PromptStructuredOutputState, ctx: RunContext<PromptStructuredOutputArgs>) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Creating a 'Hello, World!' script in ${ctx.args.language}...` },
      { key: 'status' },
    );
    this.assignState({ language: ctx.args.language });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: PromptStructuredOutputState) {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: FileDocumentSchema,
        prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { language: state.language }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const llmResult = await this.documentStore.save(FileDocument, result.data.data as FileDocumentType);
    this.assignState({ llmResult });
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptStructuredOutputState) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Successfully generated: ${state.llmResult?.content?.description ?? ''}` },
      { key: 'status' },
    );
  }
}
