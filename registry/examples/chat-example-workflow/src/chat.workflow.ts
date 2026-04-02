import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import {
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
  WorkflowTemplates,
} from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/chat.workflow.yaml',
  templates: {
    systemMessage: __dirname + '/templates/systemMessage.md',
  },
})
export class ChatWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectTemplates() templates: WorkflowTemplates;

  private runtime: WorkflowMetadataInterface;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'waiting_for_user' })
  async setup() {
    await this.claudeMessageDocument.create({
      meta: { hidden: true },
      content: { role: 'user', content: this.templates.render('systemMessage') },
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true })
  async userMessage() {
    const payload = this.runtime.transition!.payload as string;
    await this.claudeMessageDocument.create({
      content: { role: 'user', content: payload },
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result = await this.claudeGenerateText.run({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.claudeMessageDocument.create({
      id: this.llmResult!.id,
      content: this.llmResult!,
    });
  }
}
