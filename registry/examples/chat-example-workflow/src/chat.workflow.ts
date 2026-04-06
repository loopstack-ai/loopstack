import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/chat.workflow.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true })
  async userMessage() {
    const payload = this.ctx.runtime.transition!.payload as string;
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: payload });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
