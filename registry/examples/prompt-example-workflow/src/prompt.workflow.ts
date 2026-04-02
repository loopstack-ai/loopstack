import { z } from 'zod';
import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import {
  Final,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  Input,
  Workflow,
  WorkflowTemplates,
} from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/prompt.workflow.yaml',
  templates: {
    prompt: __dirname + '/templates/prompt.md',
  },
})
export class PromptWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectTemplates() templates: WorkflowTemplates;

  @Input({
    schema: z.object({
      subject: z.string().default('coffee'),
    }),
  })
  args: { subject: string };

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'prompt_executed' })
  async prompt() {
    const result = await this.claudeGenerateText.run({
      claude: { model: 'claude-sonnet-4-6' },
      prompt: this.templates.render('prompt', { subject: this.args.subject }),
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.claudeMessageDocument.create({
      id: this.llmResult!.id,
      content: this.llmResult!,
    });
  }
}
