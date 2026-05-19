import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, DocumentEntity, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

@Workflow({
  uiConfig: __dirname + '/prompt-structured-output.ui.yaml',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }> {
  @InjectTool({ provider: 'claude', model: 'claude-sonnet-4-6' })
  llmGenerateObject: LlmGenerateObjectTool;

  language!: string;
  llmResult?: DocumentEntity<FileDocumentType>;

  @Initial({ to: 'ready' })
  async greeting(args: { language: string }) {
    this.language = args.language;
    await this.repository.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${this.language}...` }],
      },
      { id: 'status' },
    );
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt() {
    const result = await this.llmGenerateObject.call({
      outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
      prompt: this.render(__dirname + '/templates/prompt.md', { language: this.language }),
    });

    const objectResult = result.data as LlmGenerateObjectResult;
    this.llmResult = await this.repository.save(FileDocument, objectResult.data as FileDocumentType, {
      validate: 'skip',
    });
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Successfully generated: ${this.llmResult?.content?.description ?? ''}` }],
      },
      { id: 'status' },
    );
  }
}
