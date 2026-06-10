---
title: Structured Output Example
description: Example workflow generating structured output from an LLM — custom document schema, Zod validation, typed LLM responses
---

# @loopstack/prompt-structured-output-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to generate structured output from an LLM using a custom document schema.

## Overview

The Prompt Structured Output Example Workflow shows how to use the `LlmGenerateObjectTool` to get structured, typed responses from an LLM. It generates a "Hello, World!" script in a user-selected programming language, with the response structured into filename, description, and code fields.

By using this workflow as a reference, you'll learn how to:

- Define custom document schemas with Zod for structured LLM output
- Use the `LlmGenerateObjectTool` to generate typed responses
- Create custom documents with the `@Document` decorator
- Manage workflow state via the state object passed through transitions
- Save and update documents with stable IDs

This example builds on the basic prompt pattern and is ideal for developers who need typed, structured responses from LLMs.

## Installation

```bash
npm install @loopstack/prompt-structured-output-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import {
  PromptStructuredOutputExampleModule,
  PromptStructuredOutputWorkflow,
} from '@loopstack/prompt-structured-output-example-workflow';

@StudioApp({
  title: 'Structured Output Example',
  workflows: [PromptStructuredOutputWorkflow],
})
@Module({
  imports: [PromptStructuredOutputExampleModule],
})
export class MyAppModule {}
```

Set your Anthropic API key as an environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## How It Works

### Key Concepts

#### 1. Custom Document Schema

Define a Zod schema for the structured output and a document class using the `@Document` decorator:

```typescript
export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

export type FileDocumentType = z.infer<typeof FileDocumentSchema>;

@Document({ schema: FileDocumentSchema, uiConfig: __dirname + '/file-document.yaml' })
export class FileDocument {
  filename: string;
  description: string;
  code: string;
}
```

The schema is passed directly to the `@Document` decorator, which validates the LLM output and configures UI rendering.

#### 2. Workflow Input with Enum Arguments

Use Zod enums to provide a dropdown selection in the UI. The schema is defined in the `@Workflow` decorator:

```typescript
@Workflow({
  title: 'Structured Output Example (Hello World Script)',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }, PromptStructuredOutputState> {
```

#### 3. Storing Arguments in State

The start `@Transition` method receives the state and context. Arguments are accessed via `ctx.args` and stored in the state object:

```typescript
@Transition({ to: 'ready' })
async greeting(state: PromptStructuredOutputState, ctx: RunContext): Promise<PromptStructuredOutputState> {
  const args = ctx.args as { language: string };
  await this.documentStore.save(
    LlmMessageDocument,
    {
      role: 'assistant',
      content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${args.language}...` }],
    },
    { id: 'status' },
  );
  return { ...state, language: args.language };
}
```

The `{ id: 'status' }` option saves the document with a stable ID so it can be updated later.

#### 4. Generating Structured Output

Use `LlmGenerateObjectTool` with an `outputSchema` (converted via `toJSONSchema`) to get typed output. Provider and model are passed via `{ config: { ... } }`:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async prompt(state: PromptStructuredOutputState): Promise<PromptStructuredOutputState> {
  const result = await this.llmGenerateObject.call(
    {
      outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
      prompt: this.render(__dirname + '/templates/prompt.md', { language: state.language }),
    },
    { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
  );

  const objectResult = result.data as LlmGenerateObjectResult;
  const llmResult = await this.documentStore.save(FileDocument, objectResult.data as FileDocumentType, {
    validate: 'skip',
  });
  return { ...state, llmResult };
}
```

The LLM response is automatically parsed and saved as a `FileDocument`. The result is stored in the state for use in the final transition.

#### 5. Updating a Document by ID

The terminal `@Transition` method updates the status message saved earlier using the same `{ id: 'status' }`:

```typescript
@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: PromptStructuredOutputState): Promise<unknown> {
  await this.documentStore.save(
    LlmMessageDocument,
    {
      role: 'assistant',
      content: [{ type: 'text', text: `Successfully generated: ${state.llmResult?.content?.description ?? ''}` }],
    },
    { id: 'status' },
  );
  return {};
}
```

### Workflow Class

The complete workflow class:

```typescript
import { z } from 'zod';
import { toJSONSchema } from 'zod';
import { BaseWorkflow, DocumentEntity, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

interface PromptStructuredOutputState {
  language?: string;
  llmResult?: DocumentEntity<FileDocumentType>;
}

@Workflow({
  title: 'Structured Output Example (Hello World Script)',
  description: 'An example workflow that demonstrates how to generate a structured output.',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }, PromptStructuredOutputState> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'ready' })
  async greeting(state: PromptStructuredOutputState, ctx: RunContext): Promise<PromptStructuredOutputState> {
    const args = ctx.args as { language: string };
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${args.language}...` }],
      },
      { id: 'status' },
    );
    return { ...state, language: args.language };
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: PromptStructuredOutputState): Promise<PromptStructuredOutputState> {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
        prompt: this.render(__dirname + '/templates/prompt.md', { language: state.language }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    const llmResult = await this.documentStore.save(FileDocument, objectResult.data as FileDocumentType, {
      validate: 'skip',
    });
    return { ...state, llmResult };
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: PromptStructuredOutputState): Promise<unknown> {
    await this.documentStore.save(
      LlmMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Successfully generated: ${state.llmResult?.content?.description ?? ''}` }],
      },
      { id: 'status' },
    );
    return {};
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, `DocumentEntity`, decorators
- `@loopstack/llm-provider-module` - Provides `LlmGenerateObjectTool` and `LlmMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
