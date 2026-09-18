---
title: Tool Authoring Examples
description: Workflow examples for authoring custom tools in Loopstack — the @Tool() decorator, Zod arg and result schemas, injected NestJS services, and tools that keep state across checkpoints.
---

# @loopstack/tool-authoring-examples

> Custom tool workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

A tool is a NestJS provider that extends `BaseTool` and carries a `@Tool()` decorator. That is the whole
contract: declare the args and result with Zod, implement `handle(args, ctx, options?)`, inject whatever
services you need. This package shows a stateless tool, a stateful one, and a workflow that calls both.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/tool-authoring-examples src/tool-authoring-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ToolAuthoringExamplesModule } from './tool-authoring-examples/tool-authoring-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), ToolAuthoringExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/tool-authoring-examples
```

```typescript
import { ToolAuthoringExamplesModule } from '@loopstack/tool-authoring-examples';
```

No provider modules, secrets or environment variables are needed — the tools are self-contained.

## Examples

| Example                     | Studio title                           | Run                                                     |
| --------------------------- | -------------------------------------- | ------------------------------------------------------- |
| [Custom Tool](#custom-tool) | `Tool Authoring - Custom Tool Example` | `loopstack run custom_tool_example --arg a=2 --arg b=3` |

The workflow pauses partway through; press **Continue** in Studio, or answer the wait transition from the
CLI with `loopstack answer <run-id>`.

---

## Custom Tool

Two tools and one workflow that calls them:

- **`MathSumTool`** — stateless. Declares `schema` (two numbers) and `resultSchema` (a number), and delegates
  the arithmetic to an injected `MathService`, showing that a tool is an ordinary NestJS provider.
- **`CounterTool`** — stateful. Holds a `count` field and increments it per call. The workflow calls it three
  times, waits for the user, then calls it three more times — the second run continues `4, 5, 6`, which is
  how you see that tool state survives the checkpoint.

The workflow also contrasts calling a tool with calling a plain private method: reach for a tool when the
operation needs a schema, interception, tracing, or to be offered to an LLM; a private method is enough for
everything else.

### Files

- `workflows/custom-tool/custom-tool-example.workflow.ts` — the workflow
- `workflows/custom-tool/custom-tool-example.ui.yaml` — the Continue button on the wait transition
- `workflows/custom-tool/tools/math-sum.tool.ts` — stateless tool with an injected service
- `workflows/custom-tool/tools/counter.tool.ts` — stateful tool
- `workflows/custom-tool/services/math.service.ts` — the injected NestJS service

## Tests

```bash
npm test
```

- `math-sum.tool.spec.ts` — tool unit tests with `testTool()`: the stateless result, and the counter's state
  across calls.
- `custom-tool-facade.spec.ts` — the workflow end to end with `runWorkflow`, including a scripted-replay run.
- `trace-consumers.spec.ts` — what the run trace supports: `coverage()`, `diffTraces()`, `createContractFake()`.

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
