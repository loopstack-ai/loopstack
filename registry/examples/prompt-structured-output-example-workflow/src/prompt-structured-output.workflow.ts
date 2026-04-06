import { z } from 'zod';
import { ClaudeGenerateDocument, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, DocumentEntity, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { FileDocument, FileDocumentType } from './documents/file-document';

@Workflow({
  uiConfig: __dirname + '/prompt-structured-output.workflow.yaml',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;

  llmResult?: DocumentEntity<FileDocumentType>;

  @Initial({ to: 'ready' })
  async greeting() {
    const args = this.ctx.args as { language: string };
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Creating a 'Hello, World!' script in ${args.language}...`,
          },
        ],
      },
      { id: 'status' },
    );
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt() {
    const args = this.ctx.args as { language: string };
    const result = await this.claudeGenerateDocument.call({
      claude: { model: 'claude-sonnet-4-6' },
      response: { document: FileDocument },
      prompt: this.render(__dirname + '/templates/prompt.md', { language: args.language }),
    });
    this.llmResult = result.data as DocumentEntity<FileDocumentType>;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Successfully generated: ${this.llmResult?.content?.description ?? ''}`,
          },
        ],
      },
      { id: 'status' },
    );
  }
}
