---
title: Chat Flows
description: Building multi-turn conversational workflows with LLMs using LlmMessageDocument, messagesSearchTag pattern, and wait transitions for user input.
---

# Chat Flows

Build multi-turn conversational workflows where users exchange messages with an LLM. Messages are persisted as documents and accumulated across turns using the `messagesSearchTag` pattern.

## Example

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, type TransitionInput, Workflow } from '@loopstack/common';
import { LlmContextDocument, LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

@Workflow({ widget: './chat.ui.yaml' })
export class ChatWorkflow extends BaseWorkflow {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'waiting_for_user' })
  async setup(state: Record<string, unknown>) {
    await this.documentStore.save(LlmContextDocument, {
      role: 'user',
      text: this.render(join(__dirname, 'templates', 'systemMessage.md')),
    });
  }

  @Transition({ from: 'waiting_for_user', to: 'ready', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, input: TransitionInput<string>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: input.data });
  }

  @Transition({ from: 'ready', to: 'waiting_for_user' })
  async llmTurn(state: Record<string, unknown>) {
    await this.llmGenerateText.call({}, { config: { provider: 'claude', model: 'claude-sonnet-4-6' } });
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

## Message Resolution

When `LlmGenerateTextTool.call()` runs, it resolves the conversation in this priority order:

1. **`args.prompt`** — if provided, used as a single user message. Documents are ignored.
2. **`args.messages`** — if provided (and no `prompt`), used as the full message array. Documents are ignored.
3. **Documents matching `config.messagesSearchTag`** — fallback when neither arg is set. Defaults to `'message'`.

When falling back to documents, the tool:

- Filters `DocumentEntity` records by `doc.tags.includes(messagesSearchTag)`
- Excludes any document with `doc.isInvalidated === true`
- Sorts by `doc.index` to preserve chronological order

This means you can run parallel conversation threads in the same workflow by saving messages under different tags and switching `messagesSearchTag` per call:

```typescript
// Save a summary-thread message
await this.documentStore.save(
  LlmMessageDocument,
  { role: 'user', text: 'Summarize the discussion so far.' },
  { tags: ['summary-chat'] },
);

// Call the LLM with only the summary thread as history
await this.llmGenerateText.call(
  {},
  { config: { provider: 'claude', model: 'claude-sonnet-4-6', messagesSearchTag: 'summary-chat' } },
);
```

If a message isn't appearing in the LLM context, check that it has the expected tag and is not invalidated.

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

Add tool calling to a chat flow by combining the patterns from [AI Tool Calling](./tool-calling.md):

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn(state: ChatState) {
  const result = await this.llmGenerateText.call(
    {},
    { config: { provider: 'claude', model: 'claude-sonnet-4-6', tools: ['get_weather', 'search_database'] } },
  );
  this.assignState({ llmResult: result.data });
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: ChatState) { ... }

@Transition({ from: 'prompt_executed', to: 'waiting_for_user' })
respond(state: ChatState) {}
```

## Registry References

- [chat-example-workflow](https://loopstack.ai/registry/loopstack-hitl-examples#prompt-input-chat) — Multi-turn chat with Claude, system message, and prompt-input widget
- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-agent-examples#custom-agent) — Chat with tool calling loop
