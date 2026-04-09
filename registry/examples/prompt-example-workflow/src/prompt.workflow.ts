import { z } from 'zod';
import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }> {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'prompt_executed' })
  async prompt(args: { subject: string }) {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
    });
    this.llmResult = result.data;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
