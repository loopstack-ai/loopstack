---
title: Prompt Example
description: Example workflow integrating an LLM using a simple prompt pattern — single-shot text generation, LlmGenerateTextTool, saving response as document
---

# @loopstack/prompt-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to integrate an LLM using a simple prompt pattern.

## Overview

The Prompt Example Workflow shows the most basic way to call an LLM in Loopstack -- using a simple text prompt. It generates a haiku about a user-provided subject.

By using this workflow as a reference, you'll learn how to:

- Define workflow input arguments with a Zod schema and default values
- Use the `prompt` parameter for simple LLM calls
- Render Handlebars template files with dynamic variables
- Manage workflow state via the state object passed through transitions
- Save LLM responses as documents using `this.documentStore.save`

This example is the ideal starting point for developers new to LLM integration in Loopstack.

## Installation

```bash
npm install @loopstack/prompt-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { PromptExampleModule, PromptWorkflow } from '@loopstack/prompt-example-workflow';

@StudioApp({
  title: 'Prompt Example',
  workflows: [PromptWorkflow],
})
@Module({
  imports: [PromptExampleModule],
})
export class MyAppModule {}
```

Set your Anthropic API key as an environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## How It Works

### Key Concepts

#### 1. Workflow Input Schema

Define input parameters with default values using a Zod schema in the `@Workflow` decorator. Extract a named type from the schema and use it on `BaseWorkflow<TArgs>` (state is typed per-transition on the `state` parameter):

```typescript
const PromptSchema = z.object({
  subject: z.string().default('coffee'),
});
type PromptArgs = z.infer<typeof PromptSchema>;

@Workflow({
  title: 'Simple Prompt Example (Write a haiku)',
  schema: PromptSchema,
})
export class PromptWorkflow extends BaseWorkflow<PromptArgs> {
```

The start `@Transition` method receives the state and context. Type `ctx.args` via `RunContext<PromptArgs>`:

```typescript
@Transition({ to: 'prompt_executed' })
async prompt(state: PromptState, ctx: RunContext<PromptArgs>): Promise<PromptState> {
  // ctx.args.subject is typed as string
```

#### 2. Simple Prompt Pattern

Use the `prompt` parameter for straightforward LLM calls without conversation history. The prompt content is rendered from a Handlebars template file with variables. Provider and model are passed at call time via `{ config: { ... } }`:

```typescript
@Transition({ to: 'prompt_executed' })
async prompt(state: PromptState, ctx: RunContext<PromptArgs>): Promise<PromptState> {
  const result = await this.llmGenerateText.call(
    {
      prompt: this.render(__dirname + '/templates/prompt.md', { subject: ctx.args.subject }),
    },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );
  return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
}
```

The `this.render()` method loads a Handlebars template and interpolates the provided variables.

#### 3. Storing Results in State

Tool results are stored in the state object returned from transitions, making them available in subsequent transitions:

```typescript
interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}
```

#### 4. Saving Documents in a Final Transition

The terminal `@Transition` saves the stored LLM result as a `LlmMessageDocument`:

```typescript
@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: PromptState): Promise<unknown> {
  await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
    meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
  });
  return {};
}
```

### Workflow Class

The complete workflow class:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { LlmGenerateTextResult, LlmResultMeta } from '@loopstack/llm-provider-module';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider-module';

interface PromptState {
  llmResult?: LlmGenerateTextResult;
  llmMeta?: LlmResultMeta;
}

const PromptSchema = z.object({
  subject: z.string().default('coffee'),
});
type PromptArgs = z.infer<typeof PromptSchema>;

@Workflow({
  title: 'Simple Prompt Example (Write a haiku)',
  description: 'An example workflow that demonstrates how to use a prompt to generate a haiku.',
  schema: PromptSchema,
})
export class PromptWorkflow extends BaseWorkflow<PromptArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'prompt_executed' })
  async prompt(state: PromptState, ctx: RunContext<PromptArgs>): Promise<PromptState> {
    const result = await this.llmGenerateText.call(
      {
        prompt: this.render(__dirname + '/templates/prompt.md', { subject: ctx.args.subject }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );
    return { llmResult: result.data, llmMeta: result.metadata as LlmResultMeta | undefined };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptState): Promise<unknown> {
    await this.documentStore.save(LlmMessageDocument, state.llmResult!.message, {
      meta: { response: state.llmResult!.response, provider: state.llmMeta!.provider },
    });
    return {};
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, decorators
- `@loopstack/llm-provider-module` - Provides `LlmGenerateTextTool` tool, `LlmGenerateTextResult` type, and `LlmMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
