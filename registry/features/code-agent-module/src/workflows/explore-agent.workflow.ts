import { z } from 'zod';
import {
  ClaudeGenerateText,
  ClaudeGenerateTextResult,
  ClaudeMessageDocument,
  ClaudeMessageDocumentContentType,
  DelegateToolCalls,
  DelegateToolCallsResult,
} from '@loopstack/claude-module';
import { BaseWorkflow, Final, Guard, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { GlobTool, GrepTool, ReadTool } from '@loopstack/remote-client';

@Workflow({
  uiConfig: __dirname + '/explore-agent.ui.yaml',
  schema: z.object({
    instructions: z.string(),
  }),
})
export class ExploreAgentWorkflow extends BaseWorkflow {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;
  @InjectTool() delegateToolCalls: DelegateToolCalls;
  @InjectTool() glob: GlobTool;
  @InjectTool() grep: GrepTool;
  @InjectTool() read: ReadTool;

  llmResult?: ClaudeGenerateTextResult;
  delegateResult?: DelegateToolCallsResult;
  finalResponse?: ClaudeMessageDocumentContentType;

  @Initial({ to: 'ready' })
  async setup(args: { instructions: string }) {
    await this.repository.save(ClaudeMessageDocument, {
      role: 'user',
      content: args.instructions,
    });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async llmTurn() {
    const result = await this.claudeGenerateText.call({
      system: `You are a codebase exploration agent. Your job is to search and read
source code to answer the user's question thoroughly.

Strategy:
1. Start with glob to find relevant files by pattern
2. Use grep to search for specific code patterns across files
3. Use read to inspect file contents in detail
4. Iterate until you have enough information
5. Respond with a clear, structured summary of your findings

Be thorough but efficient. Don't read entire files when grep
can pinpoint the relevant sections.`,
      claude: {
        model: 'claude-sonnet-4-6',
        cache: true,
      },
      messagesSearchTag: 'message',
      tools: ['glob', 'grep', 'read'],
    });
    this.llmResult = result.data as ClaudeGenerateTextResult;
    this.finalResponse = result.data as ClaudeMessageDocumentContentType;
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
  @Guard('hasToolCalls')
  async executeToolCalls() {
    const result = await this.delegateToolCalls.call({
      message: this.llmResult!,
      document: ClaudeMessageDocument,
    });
    this.delegateResult = result.data as DelegateToolCallsResult;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready' })
  @Guard('allToolsComplete')
  async toolsComplete() {}

  @Final({ from: 'prompt_executed' })
  async respond(): Promise<{ response: string }> {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, {
      id: this.llmResult!.id,
    });
    return { response: this.extractTextFromResponse() };
  }

  private hasToolCalls(): boolean {
    return this.llmResult?.stop_reason === 'tool_use';
  }

  private allToolsComplete(): boolean {
    return !!this.delegateResult?.allCompleted;
  }

  private extractTextFromResponse(): string {
    const content = this.finalResponse?.content;
    if (typeof content === 'string') return content;
    const text = ((content as any[]) ?? [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { type: string; text?: string }) => block.text ?? '')
      .join('\n');
    return text;
  }
}
