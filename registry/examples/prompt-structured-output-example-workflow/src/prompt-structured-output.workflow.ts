import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  DocumentEntity,
  TEMPLATE_RENDERER,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, LoopstackContext, TemplateRenderFn } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

interface PromptStructuredOutputState {
  language?: string;
  llmResult?: DocumentEntity<FileDocumentType>;
}

@Workflow({
  title: 'Structured Output Example (Hello World Script)',
  description:
    'An example workflow that demonstrates how to generate a structured output in Loopstack on the example of creating a "Hello, World!" script in a specified programming language.',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }, PromptStructuredOutputState> {
  constructor(
    private readonly llmGenerateObject: LlmGenerateObjectTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async greeting(state: PromptStructuredOutputState, ctx: LoopstackContext): Promise<PromptStructuredOutputState> {
    const args = ctx.args as { language: string };
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${args.language}...` }],
      },
      { id: 'status' },
    );
    return { ...state, language: args.language };
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: PromptStructuredOutputState): Promise<PromptStructuredOutputState> {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
        prompt: this.render(__dirname + '/templates/prompt.md', { language: state.language }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    const llmResult = await this.documentStore.save(FileDocument, objectResult.data as FileDocumentType, {
      validate: 'skip',
    });
    return { ...state, llmResult };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptStructuredOutputState): Promise<unknown> {
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Successfully generated: ${state.llmResult?.content?.description ?? ''}` }],
      },
      { id: 'status' },
    );
    return {};
  }
}
