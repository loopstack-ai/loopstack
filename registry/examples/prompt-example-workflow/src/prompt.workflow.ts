import { z } from 'zod';
import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'prompt_executed' })
  async prompt() {
    const args = this.ctx.args as { subject: string };
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
