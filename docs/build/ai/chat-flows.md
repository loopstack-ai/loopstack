---
title: Chat Flows
description: Building multi-turn conversational workflows with LLMs using LlmMessageDocument, messagesSearchTag pattern, and wait transitions for user input.
---

# Chat Flows

Build multi-turn conversational workflows where users exchange messages with an LLM. Messages are persisted as documents and accumulated across turns using the `messagesSearchTag` pattern.

## Example

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({ widget: __dirname + '/chat.ui.yaml' })
export class ChatWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'user', content: this.render(__dirname + '/templates/systemMessage.md') },
      { meta: { hidden: true } },
    );
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', content: payload });
    return state;
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
    await this.documentStore.save(LlmMessageDocument, result.data!.message, {
      meta: { response: result.data!.response, provider: (result.metadata as { provider: string })?.provider },
    });
    return state;
  }
}
```

## YAML Config

```yaml
title: 'Chat Assistant'

ui:
  widgets:
    - widget: prompt-input
      enabledWhen:
        - waiting_for_user
      options:
        transition: userMessage
```

## How Message Accumulation Works

1. All messages are saved as `LlmMessageDocument` — automatically tagged with `message`
2. The LLM provider module collects all documents with the `message` tag as conversation history by default
3. Each new message adds to the conversation — the LLM sees the full history on every turn

## Chat Loop Flow

```
setup → waiting_for_user → [user sends message] → ready → llmTurn → waiting_for_user (loop)
```

1. **Initial transition** — Create system message (hidden from UI)
2. Workflow enters `waiting_for_user` — UI shows the prompt-input widget
3. User sends message → `userMessage` fires, saves user message as document
4. `llmTurn` fires — calls the LLM with full message history, saves response
5. Workflow returns to `waiting_for_user` — loop continues

## Combining with Tool Calling

Add tool calling to a chat flow by combining the patterns from [AI Tool Calling](/docs/build/ai/tool-calling):

```typescript
import type { LlmResultMeta } from '@loopstack/llm-provider-module';

@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: ChatState): Promise<ChatState> {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather', 'search_database'] } },
  );
  return { ...state, llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: ChatState): Promise<ChatState> { ... }

@Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
async respond(state: ChatState): Promise<ChatState> {
  await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
    meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
  });
  return state;
}
```

## Registry References

- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Multi-turn chat with Claude, system message, and prompt-input widget
- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow) — Chat with tool calling loop
