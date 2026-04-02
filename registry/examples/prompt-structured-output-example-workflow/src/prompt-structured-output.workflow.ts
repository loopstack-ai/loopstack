import { z } from 'zod';
import { ClaudeGenerateDocument, ClaudeMessageDocument } from '@loopstack/claude-module';
import {
  DocumentEntity,
  Final,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  Input,
  Transition,
  Workflow,
  WorkflowTemplates,
} from '@loopstack/common';
import { FileDocument, FileDocumentType } from './documents/file-document';

@Workflow({
  uiConfig: __dirname + '/prompt-structured-output.workflow.yaml',
  templates: {
    prompt: __dirname + '/templates/prompt.md',
  },
})
export class PromptStructuredOutputWorkflow {
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectDocument() fileDocument: FileDocument;
  @InjectTemplates() templates: WorkflowTemplates;

  @Input({
    schema: z.object({
      language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
    }),
  })
  args: {
    language: string;
  };

  llmResult?: DocumentEntity<FileDocumentType>;

  @Initial({ to: 'ready' })
  async greeting() {
    await this.claudeMessageDocument.create({
      id: 'status',
      content: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Creating a 'Hello, World!' script in ${this.args.language}...`,
          },
        ],
      },
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt() {
    const result = await this.claudeGenerateDocument.run({
      claude: { model: 'claude-sonnet-4-6' },
      response: { document: this.fileDocument },
      prompt: this.templates.render('prompt', { language: this.args.language }),
    });
    this.llmResult = result.data as DocumentEntity<FileDocumentType>;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.claudeMessageDocument.create({
      id: 'status',
      content: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Successfully generated: ${this.llmResult?.content?.description ?? ''}`,
          },
        ],
      },
    });
  }
}
