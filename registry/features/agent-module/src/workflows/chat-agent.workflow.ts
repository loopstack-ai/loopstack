import { Inject } from '@nestjs/common';
import { z } from 'zod';
import type { RunContext } from '@loopstack/common';
import {
  BaseWorkflow,
  Guard,
  Transition,
  WORKFLOW_ORCHESTRATOR,
  Workflow,
  WorkflowOrchestrator,
} from '@loopstack/common';
import type { LlmDelegateResult, LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import {
  LlmDelegateToolCallsTool,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
import { AgentFinishTool } from '../tools/agent-finish.tool.js';

/**
 * Interactive LLM agent workflow with user chat.
 *
 * Runs an agent loop like AgentWorkflow, but instead of exiting on end_turn,
 * it waits for user input. The user can chat with the agent between LLM turns.
 *
 * - **Args** (per-invocation via `run()`): `system`, `tools`, `userMessage`, `context`, `taskMode`
 *
 * Exit behavior is controlled by `taskMode` arg:
 * - When true, the AgentFinishTool is added to the tool list. The agent exits
 *   when the LLM calls it, returning the finish tool's result.
 * - When false (default), the agent never finishes on its own. The parent
 *   workflow controls the lifecycle.
 *
 * Tools are resolved from the current workflow first, then from the workspace.
 */
const ChatAgentArgsSchema = z.object({
  system: z.string(),
  tools: z.array(z.string()),
  userMessage: z.string(),
  context: z.string().optional(),
  taskMode: z.boolean().optional(),
});

type ChatAgentArgs = z.infer<typeof ChatAgentArgsSchema>;

interface ChatAgentState {
  system: string;
  tools: string[];
  userMessage: string;
  context?: string;
  taskMode?: boolean;
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
  delegateResult?: LlmDelegateResult;
  finishResult?: unknown;
}

@Workflow({
  name: 'chat_agent',
  title: 'Chat Agent',
  description: 'An interactive LLM agent with user chat and tool calling.',
  widget: import.meta.dirname + '/chat-agent.ui.yaml',
  schema: ChatAgentArgsSchema,
})
export class ChatAgentWorkflow extends BaseWorkflow<ChatAgentArgs, ChatAgentState> {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly llmDelegateToolCalls: LlmDelegateToolCallsTool,
    private readonly llmUpdateToolResult: LlmUpdateToolResultTool,
    private readonly agentFinish: AgentFinishTool,
    @Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator,
  ) {
    super();
  }

  @Transition({ to: 'ready' })
  async setup(state: ChatAgentState, ctx: RunContext): Promise<ChatAgentState> {
    const args = ctx.args as ChatAgentArgs;
    if (args.context) {
      await this.documentStore.save(
        LlmMessageDocument,
        { role: 'user', text: args.context },
        { meta: { hidden: true } },
      );
    }

    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: args.userMessage });

    return { ...state, ...args };
  }

  @Transition({ from: 'ready', to: 'prompt_executed', timeout: 120_000 })
  async llmTurn(state: ChatAgentState): Promise<ChatAgentState> {
    const tools = state.taskMode ? [...state.tools, 'agent_finish'] : state.tools;

    const result = await this.llmGenerateText.call(
      {},
      {
        config: {
          provider: 'claude',
          system: state.system,
          tools,
        },
      },
    );

    return { ...state, llmResult: result.data, llmMeta: result.metadata };
  }

  @Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10, timeout: 120_000 })
  @Guard('hasToolCalls')
  async executeToolCalls(state: ChatAgentState): Promise<ChatAgentState> {
    // Save assistant message immediately (before tools run)
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });

    const result = await this.llmDelegateToolCalls.call({
      message: state.llmResult!.message,
      callback: { transition: 'toolResultReceived' },
    });

    const delegateResult = result.data;
    const finishResult = this.extractFinishResult(delegateResult);

    return { ...state, delegateResult, finishResult };
  }

  @Transition({ from: 'awaiting_tools', to: 'awaiting_tools', wait: true, timeout: 120_000 })
  async toolResultReceived(state: ChatAgentState, payload: unknown): Promise<ChatAgentState> {
    const result = await this.llmUpdateToolResult.call({
      delegateResult: state.delegateResult!,
      completedTool: payload,
    });

    const delegateResult = result.data as LlmDelegateResult;
    const finishResult = this.extractFinishResult(delegateResult);

    return { ...state, delegateResult, finishResult };
  }

  @Transition({ from: 'awaiting_tools', to: 'end', priority: 20 })
  @Guard('isFinished')
  async finished(state: ChatAgentState): Promise<unknown> {
    return Promise.resolve(state.finishResult);
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', timeout: 120_000 })
  @Guard('allToolsComplete')
  async toolsComplete(state: ChatAgentState): Promise<ChatAgentState> {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'user',
      blocks: state.delegateResult!.toolResults.map((tr) => ({
        type: 'tool_result' as const,
        toolCallId: tr.toolCallId,
        content: tr.content ?? '',
        isError: tr.isError ?? false,
      })),
    });

    return state;
  }

  @Transition({ from: 'awaiting_tools', to: 'ready', wait: true })
  async cancelPendingTools(state: ChatAgentState, ctx: RunContext): Promise<ChatAgentState> {
    if (ctx.workflowId) {
      await this.orchestrator.cancelChildren(ctx.workflowId);
    }
    return state;
  }

  @Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
  async respond(state: ChatAgentState): Promise<ChatAgentState> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: {
        response: state.llmResult!.response,
        provider: state.llmMeta!.provider,
      },
    });

    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: ChatAgentState, payload: string): Promise<ChatAgentState> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: payload });
    return state;
  }

  private hasToolCalls(state: ChatAgentState): boolean {
    return state.llmResult?.message.stopReason === 'tool_use';
  }

  private allToolsComplete(state: ChatAgentState): boolean {
    return !!state.delegateResult?.allCompleted;
  }

  private isFinished(state: ChatAgentState): boolean {
    return !!(state.delegateResult?.allCompleted && state.finishResult !== undefined);
  }

  private extractFinishResult(data: LlmDelegateResult | undefined): unknown {
    if (!data?.toolResults?.length) return undefined;
    for (const result of data.toolResults) {
      try {
        const parsed = JSON.parse(result.content as string) as { __agentFinish?: boolean; result?: unknown };
        if (parsed?.__agentFinish) return parsed.result;
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
