# LLM Providers

Loopstack supports multiple LLM providers (Claude, OpenAI, etc.) through a runtime registry pattern. Provider modules self-register at startup. Workflows and tools resolve providers by name, making it easy to swap or use multiple providers in parallel.

## Architecture

```
@loopstack/llm-provider-module     ← contracts, registry, adapter tools, helpers
    ↑               ↑              ↑
claude-module    openai-module   agent-module
```

- **`@loopstack/llm-provider-module`** — shared interfaces, `LlmProviderRegistry`, adapter tools (`LlmGenerateTextTool`, `LlmDelegateToolCallsTool`, `LlmUpdateToolResultTool`), shared helpers, and `LlmMessageDocument`
- **Provider modules** (e.g. `@loopstack/claude-module`, `@loopstack/openai-module`) — implement `LlmProviderInterface`, register at module init
- **`@loopstack/agent`** — generic agent workflows that work with any provider

## Quick start

### Using a single provider

```ts
// Module — import the provider
@Module({
  imports: [LoopCoreModule, AgentModule, ClaudeModule],
  providers: [MyWorkspace, MyWorkflow],
})
export class MyModule {}

// Workspace — configure tools with defaults
@Workspace({ ... })
export class MyWorkspace implements WorkspaceInterface {
  @InjectTool({ provider: 'claude', model: 'claude-opus-4-7' })
  llmGenerateText: LlmGenerateTextTool;

  @InjectWorkflow({ provider: 'claude', model: 'claude-opus-4-7' })
  chatAgent: ChatAgentWorkflow;

  @InjectTool() read: ReadTool;
  @InjectTool() glob: GlobTool;
}
```

### Using multiple providers

```ts
@Module({
  imports: [LoopCoreModule, AgentModule, ClaudeModule, OpenAiModule],
  providers: [MyWorkspace, MyWorkflow],
})
export class MyModule {}

@Workspace({ ... })
export class MyWorkspace implements WorkspaceInterface {
  @InjectWorkflow({ provider: 'claude', model: 'claude-opus-4-7' })
  smartAgent: ChatAgentWorkflow;

  @InjectWorkflow({ provider: 'openai', model: 'gpt-4o-mini' })
  fastAgent: ChatAgentWorkflow;
}
```

## Adapter tools

LLM interactions go through adapter `@Tool()` classes that route to the correct provider at runtime. This ensures all LLM calls pass through the standard tool pipeline (Zod validation, interceptors, logging).

| Tool                       | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `LlmGenerateTextTool`      | Invokes the LLM — sends system prompt, messages, and tool definitions             |
| `LlmDelegateToolCallsTool` | Executes tool calls from an LLM response — resolves tools from workflow/workspace |
| `LlmUpdateToolResultTool`  | Handles async tool completion callbacks                                           |

All three accept an optional `provider` config (defaults to `'claude'`).

### Direct usage

```ts
@InjectTool({ provider: 'claude', model: 'claude-sonnet-4-6', system: 'You are a helpful assistant.' })
llmGenerateText: LlmGenerateTextTool;

const result = await this.llmGenerateText.call({ prompt: 'What is 2+2?' });
```

### Agent workflow usage

The `ChatAgentWorkflow` and `AgentWorkflow` use these adapter tools internally. Configure via `@InjectWorkflow()` config:

```ts
@InjectWorkflow({
  provider: 'claude',
  model: 'claude-opus-4-7',
  system: 'You are a code review agent.',
  tools: ['read', 'glob', 'grep'],
})
chatAgent: ChatAgentWorkflow;

await this.chatAgent.run({
  userMessage: 'Review the latest PR.',
  taskMode: true,
});
```

## Tool and workflow defaults

### `@InjectTool(config)`

Set default config on any tool injection site. Config fields (provider, model, system, tools, maxTokens, messagesSearchTag, providerConfig) are deep-merged into every `call()` — call-site config wins.

```ts
@Workspace({ ... })
export class MyWorkspace implements WorkspaceInterface {
  // Every call to llmGenerateText gets model, system, and cache by default
  @InjectTool({ provider: 'claude', model: 'claude-opus-4-7', system: 'You are helpful.', providerConfig: { cache: true } })
  llmGenerateText: LlmGenerateTextTool;

  // Every glob call gets maxResults: 50
  @InjectTool({ maxResults: 50 })
  glob: GlobTool;
}
```

When an agent resolves `llmGenerateText` or `glob` from the workspace, the defaults apply automatically — no changes needed in the agent workflow.

### `@InjectWorkflow(config)`

Set default config on workflow injection sites. Config fields (provider, model, system, tools, maxTokens, messagesSearchTag, providerConfig) are deep-merged into every `run()` call before BullMQ serialization.

```ts
@InjectWorkflow({ provider: 'claude', model: 'claude-opus-4-7', system: 'You are helpful.', tools: ['read', 'glob'] })
chatAgent: ChatAgentWorkflow;

// These defaults are merged into every run() call:
await this.chatAgent.run({ userMessage });
// Equivalent to: { provider: 'claude', model: 'claude-opus-4-7', system: '...', tools: [...], userMessage }

// Override config per-call:
await this.chatAgent.run({ userMessage, model: 'claude-haiku-4-5' });
// model: 'claude-haiku-4-5' wins over the default
```

### Merge semantics

- Deep merge: nested objects are merged recursively
- `undefined` in call-site args does NOT override defaults — only explicit values win
- Arrays are replaced, not concatenated
- Call-site config always takes precedence over `@InjectTool`/`@InjectWorkflow` defaults

### Best practice: configure once, call cleanly

Define provider, model, system prompt, tools, and other stable config at the injection site. Pass only call-specific args (`prompt`, `messages`) in the call:

```ts
// Workspace — all config lives here
@InjectTool({
  provider: 'claude',
  model: 'claude-opus-4-7',
  system: 'You are a helpful assistant.',
  tools: ['read', 'glob'],
  messagesSearchTag: 'message',
  providerConfig: { cache: true },
})
llmGenerateText: LlmGenerateTextTool;

// Workflow — only call-specific args
const result = await this.llmGenerateText.call({ prompt: 'Summarize the codebase.' });
```

If config needs to be dynamic, pass it as the second argument:

```ts
const result = await this.llmGenerateText.call(
  { prompt: 'Summarize the codebase.' },
  { config: { system: dynamicSystemPrompt, tools: dynamicTools } },
);
```

## Message documents

All providers share a single `LlmMessageDocument` class with normalized content. The native API response is stored in `entity.meta.response` for provider-specific `resolveMessages()` round-trips.

| Document class       | Content format                                      | Frontend widget |
| -------------------- | --------------------------------------------------- | --------------- |
| `LlmMessageDocument` | Normalized (`text`, `thinking`, `tool_call` blocks) | `llm-message`   |

The document content uses `LlmNormalizedMessage` shape — the same type used by the framework for guards and routing. Native API responses (e.g. `Anthropic.Message`, `OpenAI.ChatCompletion`) are preserved in `meta.response` so providers can reconstruct API-specific formats in `resolveMessages()`.

```ts
// Save user message
await this.repository.save(LlmMessageDocument, { role: 'user', content: 'Hello' });

// Save assistant message with native response in meta
await this.repository.save(LlmMessageDocument, this.llmResult!.message, {
  meta: { response: this.llmResult!.response, provider: 'claude' },
});
```

## Creating a new provider

1. Create a new module (e.g. `@loopstack/ollama-module`)

2. Implement `LlmProviderInterface`:

```ts
@Injectable()
export class OllamaLlmProvider implements LlmProviderInterface, OnModuleInit {
  readonly providerId = 'ollama';

  constructor(
    private readonly registry: LlmProviderRegistry,
    private readonly toolsHelper: LlmToolsHelperService,
    private readonly delegateService: LlmDelegateService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async generateText(args: LlmGenerateTextArgs, ctx: LlmContext): Promise<LlmGenerateTextResult> {
    // Call your LLM API, normalize the response to LlmNormalizedMessage
  }

  async delegateToolCalls(args: LlmDelegateToolCallsArgs, ctx: LlmContext): Promise<LlmDelegateResult> {
    // Use LlmDelegateService to execute tool calls
  }

  async updateToolResult(args: LlmUpdateToolResultArgs, ctx: LlmContext): Promise<LlmDelegateResult> {
    // Use LlmDelegateService for async completion
  }

  extractUsage(response: unknown): LlmUsage | undefined {
    // Extract token usage from native response
  }

  toProviderMessage(content: LlmNormalizedMessage): unknown {
    // Convert normalized content to provider-specific format
  }
}
```

3. Export the provider and module:

```ts
@Module({
  imports: [LoopCoreModule, LlmProviderModule],
  providers: [OllamaClientService, OllamaLlmProvider],
  exports: [OllamaClientService, OllamaLlmProvider],
})
export class OllamaModule {}
```

5. The author imports your module — no changes needed anywhere else:

```ts
@Module({ imports: [AgentModule, OllamaModule] })
```

## Shared types and schemas

### `LlmConfigSchema`

Shared Zod schema for common LLM configuration. Import and embed in parent workflow schemas for typed args passthrough:

```ts
import { LlmConfigSchema } from '@loopstack/llm-provider-module';

@Workflow({
  schema: z.object({
    system: z.string(),
    tools: z.array(z.string()),
    llm: LlmConfigSchema.optional(),
  }),
})
```

### Key types

| Type                    | Description                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `LlmNormalizedMessage`  | Schema-inferred normalized message: `id`, `role`, `content`, `stopReason`                        |
| `LlmContentBlock`       | Content block union: `text`, `thinking`, `tool_call`                                             |
| `LlmGenerateTextArgs`   | Input for text generation                                                                        |
| `LlmGenerateTextResult` | Normalized response with `message` and `response` (native API)                                   |
| `LlmDelegateResult`     | Tool execution results with completion tracking                                                  |
| `LlmToolCall`           | Normalized tool call: `id`, `name`, `args`                                                       |
| `LlmStopReason`         | `'end_turn'`, `'tool_use'`, `'max_tokens'`, `'stop_sequence'`                                    |
| `LlmContext`            | Execution context passed to provider methods                                                     |
| `LlmProviderInterface`  | Contract for provider implementations                                                            |
| `getToolCalls()`        | Helper to extract `LlmToolCall[]` from message content blocks (used internally by delegate tool) |

## Env var fallbacks

Provider services fall back to environment variables when no model is specified:

| Provider | Env var                        | Default             |
| -------- | ------------------------------ | ------------------- |
| Claude   | `CLAUDE_MODEL` or `LLM__MODEL` | `claude-sonnet-4-6` |
| OpenAI   | `OPENAI_MODEL` or `LLM__MODEL` | `gpt-4o`            |

API keys:

- Claude: `ANTHROPIC_API_KEY`
- OpenAI: `OPENAI_API_KEY`

In production, prefer `@InjectTool(config)` defaults over env vars. Env vars are for standalone/demo use.
