import { z } from 'zod';
import { ClaudeGenerateText, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn() {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
    });

    await this.repository.save(ClaudeMessageDocument, result.data!, { id: result.data!.id });
  }
}
