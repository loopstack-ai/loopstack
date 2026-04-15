# @loopstack/prompt-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to integrate an LLM using a simple prompt pattern.

## Overview

The Prompt Example Workflow shows the most basic way to call an LLM in Loopstack -- using a simple text prompt. It generates a haiku about a user-provided subject.

By using this workflow as a reference, you'll learn how to:

- Define workflow input arguments with a Zod schema and default values
- Use the `prompt` parameter for simple LLM calls
- Render Handlebars template files with dynamic variables
- Store instance state on the workflow class
- Save LLM responses as documents using `this.repository.save`

This example is the ideal starting point for developers new to LLM integration in Loopstack.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Key Concepts

#### 1. Workflow Input Schema

Define input parameters with default values using a Zod schema in the `@Workflow` decorator. The workflow class extends `BaseWorkflow<TArgs>` with a matching type:

```typescript
@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }> {
```

The `@Initial` method receives the validated arguments:

```typescript
@Initial({ to: 'prompt_executed' })
async prompt(args: { subject: string }) {
```

#### 2. Simple Prompt Pattern

Use the `prompt` parameter for straightforward LLM calls without conversation history. The prompt content is rendered from a Handlebars template file with variables:

```typescript
@Initial({ to: 'prompt_executed' })
async prompt(args: { subject: string }) {
  const result = await this.claudeGenerateText.call({
    claude: { model: 'claude-sonnet-4-6' },
    prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
  });
  this.llmResult = result.data;
}
```

The `this.render()` method loads a Handlebars template and interpolates the provided variables.

#### 3. Storing Results as Instance State

Tool results are stored as instance properties on the workflow class, making them available in subsequent transitions:

```typescript
llmResult?: ClaudeGenerateTextResult;
```

#### 4. Saving Documents in a Final Transition

The `@Final` decorator marks the last transition. Here the stored LLM result is saved as a `ClaudeMessageDocument`:

```typescript
@Final({ from: 'prompt_executed' })
async respond() {
  await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
}
```

### Workflow Class

The complete workflow class:

```typescript
import { z } from 'zod';
import { ClaudeGenerateText, ClaudeGenerateTextResult, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, Final, Initial, InjectTool, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/prompt.ui.yaml',
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
export class PromptWorkflow extends BaseWorkflow<{ subject: string }> {
  @InjectTool() claudeGenerateText: ClaudeGenerateText;

  llmResult?: ClaudeGenerateTextResult;

  @Initial({ to: 'prompt_executed' })
  async prompt(args: { subject: string }) {
    const result = await this.claudeGenerateText.call({
      claude: { model: 'claude-sonnet-4-6' },
      prompt: this.render(__dirname + '/templates/prompt.md', { subject: args.subject }),
    });
    this.llmResult = result.data;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(ClaudeMessageDocument, this.llmResult!, { id: this.llmResult!.id });
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, decorators
- `@loopstack/claude-module` - Provides `ClaudeGenerateText` tool, `ClaudeGenerateTextResult` type, and `ClaudeMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
