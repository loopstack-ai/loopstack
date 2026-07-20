---
title: Advanced Workflows Examples
description: In-depth examples of advanced Loopstack workflow patterns — state, dynamic routing, error retry, sub-workflows (parent, fan-out, sequence, show modes, error handling), batch processing, custom tools, configurable modules, and built-in UI documents.
---

# @loopstack/advanced-workflows-examples

> Advanced workflow pattern examples for the [Loopstack](https://loopstack.ai) automation framework.

Deep-dive examples for framework patterns authors reach for less often but want available when they need them. Pick the example that matches your problem.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/advanced-workflows-examples src/advanced-workflows-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AdvancedWorkflowsExamplesModule } from './advanced-workflows-examples/advanced-workflows-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), AdvancedWorkflowsExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/advanced-workflows-examples
```

```typescript
import { AdvancedWorkflowsExamplesModule } from '@loopstack/advanced-workflows-examples';
```

## Required app-module configuration

Examples that exercise LLM tools (`LlmGenerateTextTool`, `LlmGenerateObjectTool` — used by Sub-Workflow, Fan-Out, Sequence, Batch Processing, Custom Tool, Module Config) call into `@loopstack/llm-provider-module`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { AdvancedWorkflowsExamplesModule } from '@loopstack/advanced-workflows-examples';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    AdvancedWorkflowsExamplesModule,
  ],
})
export class AppModule {}
```

`AdvancedWorkflowsExamplesModule` already re-imports `ClaudeModule` to register the Claude provider; `LlmProviderModule.forRoot(...)` sets the default model the tools dispatch to. Pure pattern demos that don't call an LLM (Workflow State, Dynamic Routing, Error Retry, UI Documents) work without it.

Set `ANTHROPIC_API_KEY` in the environment for the LLM examples.

## Examples

| Example                               | Studio title                                    | Description                                                                             |
| ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Workflow State](#workflow-state)     | `Advanced - Workflow State Example`             | Persist typed state across transitions via `assignState()`                              |
| [Dynamic Routing](#dynamic-routing)   | `Advanced - Dynamic Routing Example`            | Conditional routing with `@Guard` decorators and transition priorities                  |
| [Error Retry](#error-retry)           | `Advanced - Error Retry Example`                | Auto-retry, manual retry, custom error places, timeouts, hybrid                         |
| [Sub-Workflow](#sub-workflow)         | `Advanced - Sub-Workflow Example`               | Launch a child workflow via `.run()` and resume on callback                             |
| [Fan-Out](#fan-out)                   | `Advanced - Fan-Out Example`                    | Parallel sub-workflows with single aggregated callback (`FanOutWorkflow`)               |
| [Sequence](#sequence)                 | `Advanced - Sequence Example`                   | Sequential sub-workflows with single aggregated callback (`SequenceWorkflow`)           |
| [Batch Processing](#batch-processing) | `Advanced - Batch Processing Example`           | Chunked processing of a list in fixed-size batches                                      |
| [Custom Tool](#custom-tool)           | `Advanced - Custom Tool Example`                | Authoring custom tools — stateless + stateful, `@Tool()`, Zod schemas, NestJS injection |
| [Module Config](#module-config)       | `Advanced - Module Config (Default/German/...)` | `forRoot` / `forFeature` patterns for configurable modules                              |
| [UI Documents](#ui-documents)         | `Advanced - UI Documents Example`               | Smoke test for built-in document types (Message, Error, Markdown, Plain)                |

---

## Workflow State

Two related workflows demonstrating state management:

- `WorkflowStateWorkflow` — minimal pattern: assign state, read it in the next transition.
- `WorkflowToolResultsWorkflow` — store tool results in state and reference them later.

### Files

- `workflow-state-example.workflow.ts`
- `tool-results-example.workflow.ts`

## Dynamic Routing

Demonstrates `@Guard`-based conditional routing — multiple transitions out of one state, evaluated in priority order, the first one whose guard returns true wins.

### Files

- `dynamic-routing-example.workflow.ts`

## Error Retry

Demonstrates every retry/error mode in one workflow:

1. **Auto-retry** with exponential backoff
2. **Manual retry** via Retry button
3. **Custom error place** with recovery transition
4. **Timeout** with manual retry
5. **Hybrid** (auto-retry + custom error place)

### Files

- `error-retry-example.workflow.ts`
- `error-retry-example.ui.yaml`
- `tools/{step1,step2,slow}.tool.ts`

## Sub-Workflow

Five workflow files demonstrating sub-workflow composition:

- `sub-workflow-parent.workflow.ts` — basic parent that launches a child via `.run()`
- `sub-workflow-sub.workflow.ts` — the child workflow
- `sub-workflow-failing-sub.workflow.ts` — a child that always fails (used by error-handling)
- `sub-workflow-error-handling.workflow.ts` — parent handles failed children via `input.hasError` / `input.errorMessage`
- `sub-workflow-show-modes.workflow.ts` — every `show` mode (`inline`, `link`, `hidden`) in one flow

For parallel and sequential composition see [Fan-Out](../fan-out/README.md) and [Sequence](../sequence/README.md).

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
