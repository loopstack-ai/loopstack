import { z } from 'zod';
import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import {
  BaseWorkflow,
  Final,
  Initial,
  InjectTemplates,
  InjectTool,
  Workflow,
  WorkflowTemplates,
} from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/prompt.workflow.yaml',
  templates: {
    prompt: __dirname + '/templates/prompt.md',
  },
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTemplates() templates: WorkflowTemplates;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'prompt_executed' })
  async prompt() {
    const args = this.ctx.args as { subject: string };
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      prompt: this.templates.render('prompt', { subject: args.subject }),
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
