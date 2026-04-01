import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
  UpdateToolResult,
} from '@loopstack/claude-module';
import {
  Guard,
  Initial,
  InjectDocument,
  InjectTemplates,
  InjectTool,
  InjectWorkflow,
  ToolResult,
  Transition,
  Workflow,
  WorkflowMetadataInterface,
  WorkflowTemplates,
} from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTask, SecretsRequestWorkflow } from '@loopstack/core';

@Workflow({
  uiConfig: __dirname + '/secrets-agent-example.workflow.yaml',
  templates: {
    systemMessage: __dirname + '/templates/systemMessage.md',
  },
})
export class SecretsAgentExampleWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() updateToolResult: UpdateToolResult;
  @InjectTool() requestSecrets: RequestSecretsTask;
  @InjectTool() getSecretKeys: GetSecretKeysTool;
  @InjectDocument() claudeMessageDocument: ClaudeMessageDocument;
  @InjectWorkflow() secretsRequest: SecretsRequestWorkflow;
  @InjectTemplates() templates: WorkflowTemplates;

  private runtime: WorkflowMetadataInterface;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'ready' })
  async setup() {
    await this.claudeMessageDocument.create({
      meta: { hidden: true },
      content: {
        role: 'user',
        content: this.templates.render('systemMessage'),
      },
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.run({
      system: `You are a helpful assistant that manages workspace secrets.
Use getSecretKeys to check existing secrets, and requestSecrets to ask the user for new ones.

IMPORTANT: When using requestSecrets, it must be the ONLY tool call in your response.
Do not combine it with other tool calls.`,
      claude: { model: 'claude-haiku-4-5-20251001' },
      messagesSearchTag: 'message',
      tools: ['getSecretKeys', 'requestSecrets'],
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.run({
      message: this.llmResult!,
      document: 'claudeMessageDocument',
      callback: { transition: 'toolResultReceived' },
    });
    this.delegateResult = result.data;
  }

  hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true })
  async toolResultReceived() {
    const result: ToolResult<DelegateToolCallsResult> = await this.updateToolResult.run({
      delegateResult: this.delegateResult!,
      completedTool: this.runtime.transition!.payload as Record<string, unknown>,
      document: 'claudeMessageDocument',
    });
    this.delegateResult = result.data;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  allToolsCompleteTransition() {}

  allToolsComplete(): boolean {
    return this.delegateResult?.allCompleted ?? false;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond() {
    await this.claudeMessageDocument.create({
      id: this.llmResult!.id,
      content: this.llmResult!,
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true })
  async userMessage() {
    await this.claudeMessageDocument.create({
      content: {
        role: 'user',
        content: this.runtime.transition!.payload as string,
      },
    });
  }
}
