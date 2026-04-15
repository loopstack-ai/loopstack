import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  BaseWorkflow,
  DocumentEntity,
  Final,
  Guard,
  Initial,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/secrets-module';

@Workflow({
  uiConfig: __dirname + '/secrets-agent-example.ui.yaml',
})
export class SecretsAgentExampleWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() requestSecrets: RequestSecretsTask;
  @InjectTool() getSecretKeys: GetSecretKeysTool;
  @InjectWorkflow() secretsRequest: SecretsRequestWorkflow;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'ready' })
  async setup() {
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'user',
        content: this.render(__dirname + '/templates/systemMessage.md'),
      },
      { meta: { hidden: true } },
    );
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      system: `You are a helpful assistant that manages workspace secrets.
Use getSecretKeys to check existing secrets, and requestSecrets to ask the user for new ones.

IMPORTANT: When using requestSecrets, it must be the ONLY tool call in your response.
Do not combine it with other tool calls.

When all secrets are available, respond with one sentence including a list of the requested secrets.`,
      claude: { model: 'claude-haiku-4-5-20251001' },
      messagesSearchTag: 'message',
      tools: ['getSecretKeys', 'requestSecrets'],
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
      message: this.llmResult!,
      document: ClaudeMessageDocument,
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, schema: z.record(z.string(), z.unknown()) })
  async toolResultReceived(payload: Record<string, unknown>) {
    const result: ToolResult<DelegateToolCallsResult> = await this.updateToolResult.call({
      delegateResult: this.delegateResult!,
      completedTool: payload,
      document: ClaudeMessageDocument,
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition() {}

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(payload: string) {
    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: payload,
    });
  }

  @Final({ from: 'prompt_executed' })
  async respond(): Promise<DocumentEntity> {
    return this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
