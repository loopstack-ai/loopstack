# @loopstack/prompt-structured-output-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to generate structured output from an LLM using a custom document schema.

## Overview

The Prompt Structured Output Example Workflow shows how to use the `ClaudeGenerateDocument` tool to get structured, typed responses from an LLM. It generates a "Hello, World!" script in a user-selected programming language, with the response structured into filename, description, and code fields.

By using this workflow as a reference, you'll learn how to:

- Define custom document schemas with Zod for structured LLM output
- Use the `ClaudeGenerateDocument` tool to generate typed responses
- Create custom documents with the `@Document` decorator
- Store workflow state as instance properties
- Save and update documents with stable IDs

This example builds on the basic prompt pattern and is ideal for developers who need typed, structured responses from LLMs.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

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
  uiConfig: __dirname + '/prompt-structured-output.ui.yaml',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }> {
```

#### 3. Storing Arguments as Instance State

The `@Initial` method receives the validated arguments and stores them as instance properties for use in later transitions:

```typescript
language!: string;

@Initial({ to: 'ready' })
async greeting(args: { language: string }) {
  this.language = args.language;
  await this.repository.save(
    ClaudeMessageDocument,
    {
      role: 'assistant',
      content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${this.language}...` }],
    },
    { id: 'status' },
  );
}
```

The `{ id: 'status' }` option saves the document with a stable ID so it can be updated later.

#### 4. Generating Structured Output

Use `ClaudeGenerateDocument` with a `response.document` to get typed output:

```typescript
@Transition({ from: 'ready', to: 'prompt_executed' })
async prompt() {
  const result = await this.claudeGenerateDocument.call({
    claude: { model: 'claude-sonnet-4-6' },
    response: { document: FileDocument },
    prompt: this.render(__dirname + '/templates/prompt.md', { language: this.language }),
  });
  this.llmResult = result.data as DocumentEntity<FileDocumentType>;
}
```

The LLM response is automatically parsed and validated against the `FileDocument` schema. The result is stored as an instance property for use in the final transition.

#### 5. Updating a Document by ID

The `@Final` method updates the status message saved earlier using the same `{ id: 'status' }`:

```typescript
@Final({ from: 'prompt_executed' })
async respond() {
  await this.repository.save(
    ClaudeMessageDocument,
    {
      role: 'assistant',
      content: [{ type: 'text', text: `Successfully generated: ${this.llmResult?.content?.description ?? ''}` }],
    },
    { id: 'status' },
  );
}
```

### Workflow Class

The complete workflow class:

```typescript
import { z } from 'zod';
import { ClaudeGenerateDocument, ClaudeMessageDocument } from '@loopstack/claude-module';
import { BaseWorkflow, DocumentEntity, Final, Initial, InjectTool, Transition, Workflow } from '@loopstack/common';
import { FileDocument, FileDocumentType } from './documents/file-document';

@Workflow({
  uiConfig: __dirname + '/prompt-structured-output.ui.yaml',
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<{ language: string }> {
  @InjectTool() claudeGenerateDocument: ClaudeGenerateDocument;

  language!: string;
  llmResult?: DocumentEntity<FileDocumentType>;

  @Initial({ to: 'ready' })
  async greeting(args: { language: string }) {
    this.language = args.language;
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Creating a 'Hello, World!' script in ${this.language}...` }],
      },
      { id: 'status' },
    );
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt() {
    const result = await this.claudeGenerateDocument.call({
      claude: { model: 'claude-sonnet-4-6' },
      response: { document: FileDocument },
      prompt: this.render(__dirname + '/templates/prompt.md', { language: this.language }),
    });
    this.llmResult = result.data as DocumentEntity<FileDocumentType>;
  }

  @Final({ from: 'prompt_executed' })
  async respond() {
    await this.repository.save(
      ClaudeMessageDocument,
      {
        role: 'assistant',
        content: [{ type: 'text', text: `Successfully generated: ${this.llmResult?.content?.description ?? ''}` }],
      },
      { id: 'status' },
    );
  }
}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/common` - Core framework functionality, `BaseWorkflow`, `DocumentEntity`, decorators
- `@loopstack/claude-module` - Provides `ClaudeGenerateDocument` tool and `ClaudeMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
