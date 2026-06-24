import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, DocumentEntity, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

interface StructuredOutputState {
  language?: string;
  llmResult?: DocumentEntity<FileDocumentType>;
}

const StructuredOutputArgsSchema = z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
});

type StructuredOutputArgs = z.infer<typeof StructuredOutputArgsSchema>;

@Workflow({
  title: 'LLM - Structured Output Example (Hello World Script)',
  description:
    'Demonstrates generating structured LLM output using LlmGenerateObjectTool with a custom document schema. Generates a "Hello, World!" script in a chosen programming language.',
  schema: StructuredOutputArgsSchema,
})
export class StructuredOutputExampleWorkflow extends BaseWorkflow<StructuredOutputArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'ready' })
  async greeting(state: StructuredOutputState, ctx: RunContext<StructuredOutputArgs>) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Creating a 'Hello, World!' script in ${ctx.args.language}...` },
      { key: 'status' },
    );
    this.assignState({ language: ctx.args.language });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: StructuredOutputState) {
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
  async respond(state: StructuredOutputState) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Successfully generated: ${state.llmResult?.content?.description ?? ''}` },
      { key: 'status' },
    );
  }
}
