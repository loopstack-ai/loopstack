---
title: API: @loopstack/agent
description: Public API reference for @loopstack/agent
includeInLlmsFullTxt: false
---

# API: @loopstack/agent

## Classes

### AgentFinishTool

Tool that signals the agent has completed its task and returns the final result.

The LLM calls this to end the loop, passing the final `result` as a structured object
or string. Returns an `AgentFinishResult` the agent workflow uses to exit.

```ts
import { AgentFinishTool } from '@loopstack/agent';
```

**Provided by:** `AgentModule`

```ts
export class AgentFinishTool extends BaseTool<AgentFinishInput, object, AgentFinishResult> {
  protected handle(args: AgentFinishInput): Promise<ToolEnvelope<AgentFinishResult>>;
}
```

### AgentModule

NestJS module that provides the agent workflows (`AgentWorkflow`,
`ChatAgentWorkflow`) and the `AgentFinishTool`.

Registration:

- `AgentModule` (bare import) — registers the agent workflows; the LLM
  provider/model defaults come from whatever `LlmProviderModule` is configured
  app-wide.
- `AgentModule.forFeature({ llm })` — same workflows, but with a feature-scoped
  `LlmProviderModule.forFeature(llm)` so this scope uses its own provider/model
  defaults.

Requires: `LlmProviderModule` plus a registered provider module (e.g.
`ClaudeModule` / `OpenAiModule`) available in the app — the agent loop runs its
turns through that provider.

```ts
import { AgentModule } from '@loopstack/agent';
```

```ts
export class AgentModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule;
}
```

### AgentWorkflow

Workflow that runs a generic LLM agent loop: prompt the LLM, delegate any tool
calls, feed their results back, and repeat until the model returns `end_turn`.

Args (per `run()`): `system`, `tools`, `userMessage`, and optional `context`.
Tools are resolved from the current workflow first, then from the workspace.
On completion it publishes an `AgentResult` with the final assistant `response`.

```ts
import { AgentWorkflow } from '@loopstack/agent';
```

**Provided by:** `AgentModule`

```ts
export class AgentWorkflow extends BaseWorkflow<AgentArgs> {
  constructor(
    llmGenerateText: LlmGenerateTextTool,
    llmDelegateToolCalls: LlmDelegateToolCallsTool,
    llmUpdateToolResult: LlmUpdateToolResultTool,
    orchestrator: WorkflowOrchestrator,
  );
  setup(state: AgentState, ctx: RunContext<AgentArgs>): Promise<void>;
  llmTurn(state: AgentState): Promise<void>;
  executeToolCalls(state: AgentState): Promise<void>;
  toolResultReceived(state: AgentState, input: TransitionInput): Promise<void>;
  toolsComplete(_state: AgentState): void;
  cancelPendingTools(state: AgentState, ctx: RunContext): Promise<void>;
  respond(state: AgentState): void;
}
```

### ChatAgentWorkflow

Workflow that runs an interactive LLM agent loop with user chat between turns.

Behaves like `AgentWorkflow `, but instead of exiting on `end_turn` it
transitions to `waiting_for_user` and resumes on the next user message. When
the `taskMode` arg is set, the `agent_finish` tool is added and the LLM
calling it ends the workflow with that tool's result.

```ts
import { ChatAgentWorkflow } from '@loopstack/agent';
```

**Provided by:** `AgentModule`

```ts
export class ChatAgentWorkflow extends BaseWorkflow<ChatAgentArgs> {
  constructor(
    llmGenerateText: LlmGenerateTextTool,
    llmDelegateToolCalls: LlmDelegateToolCallsTool,
    llmUpdateToolResult: LlmUpdateToolResultTool,
    agentFinish: AgentFinishTool,
    orchestrator: WorkflowOrchestrator,
  );
  setup(state: ChatAgentState, ctx: RunContext<ChatAgentArgs>): Promise<void>;
  llmTurn(state: ChatAgentState): Promise<void>;
  executeToolCalls(state: ChatAgentState): Promise<void>;
  toolResultReceived(state: ChatAgentState, payload: unknown): Promise<void>;
  finished(state: ChatAgentState): void;
  toolsComplete(_state: ChatAgentState): void;
  cancelPendingTools(state: ChatAgentState, ctx: RunContext): Promise<void>;
  respond(_state: ChatAgentState): void;
  userMessage(state: ChatAgentState, input: TransitionInput<string>): Promise<void>;
}
```

## Type Aliases

### AgentArgs

Args for `AgentWorkflow` (passed to `run()`).

Holds `system`, `tools`, `userMessage`, and optional `context`.

```ts
import { AgentArgs } from '@loopstack/agent';
```

```ts
export type AgentArgs = z.infer<typeof AgentArgsSchema>;
```

### AgentResult

Result returned by AgentWorkflow, inferred from `AgentResultSchema`.

Holds the final assistant `response` text.

```ts
import { AgentResult } from '@loopstack/agent';
```

```ts
export type AgentResult = z.infer<typeof AgentResultSchema>;
```

### ChatAgentArgs

Args for `ChatAgentWorkflow` (passed to `run()`).

Holds `system`, `tools`, `userMessage`, optional `context`, and optional `taskMode`.

```ts
import { ChatAgentArgs } from '@loopstack/agent';
```

```ts
export type ChatAgentArgs = z.infer<typeof ChatAgentArgsSchema>;
```

## Variables

### AgentArgsSchema

Zod schema for `AgentWorkflow` args (what callers pass to `run()`).

```ts
import { AgentArgsSchema } from '@loopstack/agent';
```

```ts
AgentArgsSchema: z.ZodObject<
  {
    system: z.ZodString;
    tools: z.ZodArray<z.ZodString>;
    userMessage: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
```

### AgentResultSchema

Zod schema for the result published by AgentWorkflow.

Validates a single `response` string holding the final assistant message.
Reusable as the `schema:` on a parent's callback wait-transition.

```ts
import { AgentResultSchema } from '@loopstack/agent';
```

```ts
AgentResultSchema: z.ZodObject<
  {
    response: z.ZodString;
  },
  z.core.$strip
>;
```

### ChatAgentArgsSchema

Zod schema for `ChatAgentWorkflow` args (what callers pass to `run()`).

```ts
import { ChatAgentArgsSchema } from '@loopstack/agent';
```

```ts
ChatAgentArgsSchema: z.ZodObject<
  {
    system: z.ZodString;
    tools: z.ZodArray<z.ZodString>;
    userMessage: z.ZodString;
    context: z.ZodOptional<z.ZodString>;
    taskMode: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
```
