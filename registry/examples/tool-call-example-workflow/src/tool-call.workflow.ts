import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  DelegateToolCalls,
  DelegateToolCallsResult,
} from '@loopstack/claude-module';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { GetWeather } from './tools/get-weather.tool';

@Workflow({
  uiConfig: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() getWeather: GetWeather;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;

  @Initial({ to: 'ready' })
  async setup() {
    await this.repository.save(ClaudeMessageDocument, { role: 'user', content: 'How is the weather in Berlin?' });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result: ToolResult<ClaudeGenerateTextResult> = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      messagesSearchTag: 'message',
      tools: ['getWeather'],
    });
    this.llmResult = result.data;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result: ToolResult<DelegateToolCallsResult> = await this.delegateToolCalls.call({
      message: this.llmResult!,
      document: ClaudeMessageDocument,
    });
    this.delegateResult = result.data;
  }

  hasToolCalls() {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete() {}

  allToolsComplete() {
    return this.delegateResult?.allCompleted;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
