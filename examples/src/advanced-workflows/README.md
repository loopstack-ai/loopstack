---
title: Advanced Workflows Examples
description: In-depth examples of advanced Loopstack workflow patterns — state, dynamic routing, sub-workflows (parent, fan-out, sequence, show modes, error handling), batch processing, custom tools, configurable modules, and built-in UI documents.
---

# Advanced Workflows Examples

> Advanced workflow pattern examples for the [Loopstack](https://loopstack.ai) automation framework.

Deep-dive examples for framework patterns authors reach for less often but want available when they need them. Pick the example that matches your problem.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/claude-module @loopstack/common @loopstack/core @loopstack/llm-provider-module
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AdvancedWorkflowsExamplesModule } from './advanced-workflows/advanced-workflows-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), AdvancedWorkflowsExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

Examples that exercise LLM tools (`LlmGenerateTextTool`, `LlmGenerateObjectTool` — used by Sub-Workflow, Fan-Out, Sequence, Batch Processing, Custom Tool, Module Config) call into `@loopstack/llm-provider-module`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AdvancedWorkflowsExamplesModule } from './advanced-workflows/advanced-workflows-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    AdvancedWorkflowsExamplesModule,
  ],
})
export class AppModule {}
```

`AdvancedWorkflowsExamplesModule` already re-imports `ClaudeModule` to register the Claude provider; `LlmProviderModule.forRoot(...)` sets the default model the tools dispatch to. Pure pattern demos that don't call an LLM (Workflow State, Dynamic Routing, UI Documents) work without it.

Set `ANTHROPIC_API_KEY` in the environment for the LLM examples.

## Examples

| Example                               | Studio title                                    | Description                                                                             |
| ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Workflow State](#workflow-state)     | `Advanced - Workflow State Example`             | Persist typed state across transitions via `assignState()`                              |
| [Workflow Result](#workflow-result)   | `Advanced - Workflow Result Example`            | Publish a result for callers via `assignResult()`, kept apart from private state        |
| [Dynamic Routing](#dynamic-routing)   | `Advanced - Dynamic Routing Example`            | Conditional routing with `@Guard` decorators and transition priorities                  |
| [Sub-Workflow](#sub-workflow)         | `Advanced - Sub-Workflow Example`               | Launch a child workflow via `.run()` and resume on callback                             |
| [Fan-Out](#fan-out)                   | `Advanced - Fan-Out Example`                    | Parallel sub-workflows with single aggregated callback (`FanOutWorkflow`)               |
| [Sequence](#sequence)                 | `Advanced - Sequence Example`                   | Sequential sub-workflows with single aggregated callback (`SequenceWorkflow`)           |
| [Batch Processing](#batch-processing) | `Advanced - Batch Processing Example`           | Chunked processing of a list in fixed-size batches                                      |
| [Custom Tool](#custom-tool)           | `Advanced - Custom Tool Example`                | Authoring custom tools — stateless + stateful, `@Tool()`, Zod schemas, NestJS injection |
| [Module Config](#module-config)       | `Advanced - Module Config (Default/German/...)` | `forRoot` / `forFeature` patterns for configurable modules                              |
| [UI Documents](#ui-documents)         | `Advanced - UI Documents Example`               | Smoke test for built-in document types (Message, Error, Markdown, Plain)                |

---

## Workflow State

`WorkflowStateWorkflow` — the minimal state pattern: `assignState()` in one transition, read the typed `state` parameter in the next, and format it with a private helper method. State is private to the workflow, so the run publishes no result.

### Files

- `workflow-state-example.workflow.ts`

## Workflow Result

`WorkflowResultWorkflow` — the workflow's published result. The first transition keeps a name in state and publishes a greeting with `assignResult()`. The second reads the name from state and adds a second field with another `assignResult()`, which merges into the first. The run's result is `{ greeting, shout }` — what `WorkflowRunner` callers, parent callbacks (`input.data`) and the API receive — while the name stays in private state.

### Files

- `workflow-result-example.workflow.ts`

## Dynamic Routing

Demonstrates `@Guard`-based conditional routing — multiple transitions out of one state, evaluated in priority order, the first one whose guard returns true wins.

### Files

- `dynamic-routing-example.workflow.ts`

## Sub-Workflow

Five workflow files demonstrating sub-workflow composition:

- `sub-workflow-parent.workflow.ts` — basic parent that launches a child via `.run()`
- `sub-workflow-sub.workflow.ts` — the child workflow
- `sub-workflow-failing-sub.workflow.ts` — a child that always fails (used by error-handling)
- `sub-workflow-error-handling.workflow.ts` — parent handles failed children via `input.hasError` / `input.errorMessage`
- `sub-workflow-show-modes.workflow.ts` — every `show` mode (`inline`, `link`, `hidden`) in one flow

For parallel and sequential composition see [Fan-Out](#fan-out) and [Sequence](#sequence).

## Fan-Out

Launches multiple sub-workflows in parallel via `FanOutWorkflow` from `@loopstack/core`. The parent receives a single callback once all children complete.

### Files

- `fan-out-example.workflow.ts`

## Sequence

Runs multiple sub-workflows one at a time via `SequenceWorkflow` from `@loopstack/core`. The parent receives a single aggregated callback after the last child completes.

### Files

- `sequence-example.workflow.ts`

## Batch Processing

Processes a list of items in fixed-size batches. Items within a batch run concurrently (`Promise.all`), batches run sequentially via a state-machine loop. Distinct from `FanOutWorkflow` which runs all sub-workflows simultaneously.

Useful for rate-limited APIs, memory-bounded processing, or quota-constrained operations.

### Files

- `batch-processing-example.workflow.ts`

## Custom Tool

Demonstrates authoring custom tools by extending `BaseTool`:

- `MathSumTool` — stateless, computes `a + b`
- `CounterTool` — stateful, persists across checkpoints
- `MathService` — supporting NestJS service injected into a tool

### Files

- `custom-tool-example.workflow.ts`
- `custom-tool-example.ui.yaml`
- `tools/math-sum.tool.ts` (stateless)
- `tools/counter.tool.ts` (stateful)
- `services/math.service.ts`

## Module Config

Four scenarios for configurable modules:

1. **Default Greeting** — no `forFeature` override; uses `forRoot` global defaults
2. **German Greeting** — `forFeature` override per module
3. **French Greeting** — independent `forFeature`, proves per-module isolation
4. **Nested Greeting** — config passed through a wrapper module (`GreeterAgentModule.forFeature`)

Each consumer module registers its own `@Workflow` so all four show up in the sidebar.

### Files

- `greeter/` — configurable module (`forRoot`, `forFeature`, constants, tool)
- `consumers/` — four module + workflow pairs, one per scenario

## UI Documents

A small workflow that saves one of each built-in document type so you can verify Studio renders them correctly.

### Files

- `ui-documents-example.workflow.ts`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
