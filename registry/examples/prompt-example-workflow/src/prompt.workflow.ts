import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }> {
  @InjectTool({ provider: 'claude', model: 'claude-sonnet-4-6' })
  llmGenerateText: LlmGenerateTextTool;

  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;

  @Initial({ to: 'prompt_executed' })
  async prompt(args: { subject: string }) {
    const result = await this.llmGenerateText.call({
      prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
    });
    this.llmResult = result.data;
    this.llmMeta = result.metadata;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
      meta: { response: this.llmResult!.response, provider: this.llmMeta!.provider },
    });
  }
}
