import { z } from 'zod';
import { BaseWorkflow, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({
  uiConfig: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  @InjectTool({ provider: 'claude', model: 'claude-sonnet-4-6' })
  llmGenerateText: LlmGenerateTextTool;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      LlmMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(LlmMessageDocument, { role: 'user', content: payload });
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn() {
    const result = await this.llmGenerateText.call();

    await this.repository.save(LlmMessageDocument, result.data!.message, {
      meta: { response: result.data!.response, provider: result.metadata!.provider },
    });
  }
}
