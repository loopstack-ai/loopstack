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
npm install @loopstack/claude @loopstack/common @loopstack/core @loopstack/llm-provider
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

Examples that exercise LLM tools (`LlmGenerateTextTool`, `LlmGenerateObjectTool` — used by Sub-Workflow, Fan-Out, Sequence, Batch Processing, Custom Tool, Server Tool, Module Config) call into `@loopstack/llm-provider`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
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

| Example                               | Studio title                                       | Description                                                                             |
| ------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Workflow State](#workflow-state)     | `Advanced - Workflow State Example`                | Persist typed state across transitions via `assignState()`                              |
| [Workflow Result](#workflow-result)   | `Advanced - Workflow Result Example`               | Publish a result for callers via `assignResult()`, kept apart from private state        |
| [Dynamic Routing](#dynamic-routing)   | `Advanced - Dynamic Routing Example`               | Conditional routing with `@Guard` decorators and transition priorities                  |
| [Sub-Workflow](#sub-workflow)         | `Advanced - Sub-Workflow Example`                  | Launch a child workflow via `.run()` and resume on callback                             |
| [Fan-Out](#fan-out)                   | `Advanced - Fan-Out Example`                       | Parallel sub-workflows with single aggregated callback (`FanOutWorkflow`)               |
| [Sequence](#sequence)                 | `Advanced - Sequence Example`                      | Sequential sub-workflows with single aggregated callback (`SequenceWorkflow`)           |
| [Batch Processing](#batch-processing) | `Advanced - Batch Processing Example`              | Chunked processing of a list in fixed-size batches                                      |
| [Custom Tool](#custom-tool)           | `Advanced - Custom Tool Example`                   | Authoring custom tools — stateless + stateful, `@Tool()`, Zod schemas, NestJS injection |
| [Server Tool](#server-tool)           | `Advanced - Server Tool Example`                   | Authoring a server tool — a tool the LLM provider runs, via `ServerTool`                |
| [Tool Documents](#tool-documents)     | `Advanced - Tool Documents Example`                | A tool that declares a document on its result envelope instead of saving it             |
| [Module Config](#module-config)       | `Advanced - Module Config (Default/French/Nested)` | `forRoot` / `forFeature` patterns for configurable modules                              |
| [UI Documents](#ui-documents)         | `Advanced - UI Documents Example`                  | Smoke test for built-in document types (Message, Error, Markdown, Plain)                |

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
- `sub-workflow-failing-sub.workflow.ts` — a child that fails unless started with `fail: false` (used by error-handling)
- `sub-workflow-error-handling.workflow.ts` — parent names one transition per outcome, `onSuccess` and `onFailure`; pass `fail: false` to see the success branch
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

## Server Tool

Demonstrates authoring a server tool by extending `ServerTool` — a tool the LLM provider runs itself, not your app:

- `CodeExecutionTool` (`example_code_execution`) — has no `handle()` and no `call()`. It only implements `toServerToolConfig()`, which returns the provider-native tool spec (here Anthropic's `code_execution`).
- The workflow lists the tool by name in the `tools` config of an `llm_generate_text` call. It never calls the tool itself: Claude runs the code in Anthropic's sandbox, inside that same call.
- The reply carries Claude's use of the tool as a `server_tool_use` block and its output as a `server_tool_result` block. The workflow reads the code and its stdout from these blocks, and Studio shows them as one tool call with its result.

A server tool runs only on the provider whose native spec it returns — this one on Claude. Other providers reject a call that lists it. The spec fakes only the Anthropic client, so `toServerToolConfig()` and the Claude provider run in the test.

### Files

- `server-tool-example.workflow.ts`
- `tools/code-execution.tool.ts`

## Tool Documents

Demonstrates a tool that produces a document without writing it:

- `ReceiptTool` (`create_receipt`) — totals a list of items and returns the total as `data`. It returns the receipt in `documents` on its result envelope: the document name, the content, and the same options as `documentStore.save()`. It gets the name with `resolveDocumentName(ReceiptDocument)`, so the name always matches the registered class.
- `ReceiptDocument` (`receipt`) — a registered `@Document` that Studio renders as Markdown. A declared document must be a registered `@Document`. Otherwise the tool call fails with `Unknown document`.
- The workflow only calls the tool and publishes the total. It saves no document itself: the tool pipeline saves the declared receipt after the call.

The pipeline saves declared documents after any interceptor or replay. So a replayed call saves the documents of its recorded envelope, as a live call would. The spec shows both: a live run saves the receipt the tool built, and a replayed run saves the receipt from the recording.

### Files

- `tool-documents-example.workflow.ts`
- `tools/receipt.tool.ts`
- `documents/receipt-document.ts`

## Module Config

Three scenarios for configurable modules, each a workflow that calls `GreeterTool` and saves the greeting it gets back:

1. **Default Greeting** (`default_greeting`) — no `forFeature` override; uses the app's `forRoot({ language: 'en' })` → `Hello, World! [language=en]`
2. **French Greeting** (`french_greeting`) — a `forFeature({ language: 'fr' })` override in its own module → `Bonjour, Monde! [language=fr]`
3. **Nested Greeting** (`nested_greeting`) — config passed through a wrapper module (`GreeterAgentModule.forFeature`) → `Hola, Mundo! [language=es]`

All three run side by side in one app, each with its own resolved config. Each consumer module provides its own workflow, so the workflows get the `GreeterTool` of that module's scope. The `@StudioApp` `workflows` list names them, so they can be started from Studio, the API and the CLI. They are not listed again in the module's `providers`, because a second instance there would resolve the global config.

### Files

- `greeter/` — configurable module (`forRoot`, `forFeature`, constants, tool) and the `GreeterAgentModule` wrapper
- `consumers/` — three module + workflow pairs, one per scenario

## UI Documents

A small workflow that saves one of each built-in document type so you can verify Studio renders them correctly.

### Files

- `ui-documents-example.workflow.ts`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
