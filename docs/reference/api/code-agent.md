---
title: 'API: @loopstack/code-agent'
description: 'Public API reference for @loopstack/code-agent'
includeInLlmsFullTxt: false
---

# API: @loopstack/code-agent

## Classes

### CodeAgentModule

NestJS module that provides the codebase-exploration tool `ExploreTask` (`explore_task`), which launches an `AgentWorkflow` sub-agent that searches and reads a remote workspace with the `glob`/`grep`/`read` tools and returns a synthesized answer.

Registration:

- `CodeAgentModule` — bare import registers `ExploreTask` and re-exports `AgentModule`; use this when the agent's default LLM configuration is fine.
- `CodeAgentModule.forFeature(config?: { llm?: LlmModuleConfig })` — use to override the LLM provider/model for the code agent; it imports `AgentModule.forFeature(config)`.

Requires, configured in your app:

- `LlmProviderModule` with a registered LLM provider — needed by the imported `AgentModule`.
- `RemoteClientModule` (bare or `forRoot`) — supplies the `glob`/`grep`/`read` tools the `explore_task` sub-agent uses. Without it the app fails at boot with an error naming `RemoteClientModule`.

```ts
import { CodeAgentModule } from '@loopstack/code-agent';
```

```ts
export class CodeAgentModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule;
}
```

### ExploreTask

Tool that launches an `AgentWorkflow` sub-agent to explore and analyze a codebase with the `glob`/`grep`/`read` tools and return a synthesized summary.

Those tools come from `RemoteClientModule`. Constructing `ExploreTask` without them throws, so an app that has not wired the remote client fails at boot instead of on the first `explore_task` call.

```ts
import { ExploreTask } from '@loopstack/code-agent';
```

**Provided by:** `CodeAgentModule`

```ts
export class ExploreTask extends BaseTool<ExploreTaskInput, object, ExploreTaskResult> {
  constructor(agentWorkflow: AgentWorkflow);
  protected handle(
    args: ExploreTaskInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<ExploreTaskResult>>;
  complete(result: Record<string, unknown>): Promise<ToolEnvelope<ExploreTaskResult>>;
}
```

## Type Aliases

### ExploreTaskInput

Args for `ExploreTask`.

```ts
import { ExploreTaskInput } from '@loopstack/code-agent';
```

```ts
export type ExploreTaskInput = z.infer<typeof ExploreTaskInputSchema>;
```

### ExploreTaskResult

Result for `ExploreTask` (`explore_task`) — the synthesized exploration summary or its pending workflow reference.

```ts
import { ExploreTaskResult } from '@loopstack/code-agent';
```

```ts
export type ExploreTaskResult =
  | {
      workflowId: string;
    }
  | string
  | Record<string, unknown>;
```

## Variables

### ExploreTaskInputSchema

Zod schema for `ExploreTask` args.

```ts
import { ExploreTaskInputSchema } from '@loopstack/code-agent';
```

```ts
ExploreTaskInputSchema: z.ZodObject<
  {
    instructions: z.ZodString;
  },
  z.core.$strict
>;
```
