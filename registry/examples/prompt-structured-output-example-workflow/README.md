# @loopstack/prompt-structured-output-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to generate structured output from an LLM using a custom document schema.

## Overview

The Prompt Structured Output Example Workflow shows how to use the `aiGenerateDocument` tool to get structured, typed responses from an LLM. It generates a "Hello, World!" script in a user-selected programming language, with the response structured into filename, description, and code fields.

By using this workflow as a reference, you'll learn how to:

- Define custom document schemas with Zod for structured LLM output
- Use the `aiGenerateDocument` tool to generate typed responses
- Create custom documents with form configuration
- Store structured data in workflow state using `@WithState`

This example builds on the basic prompt pattern and is ideal for developers who need typed, structured responses from LLMs.

## Installation

### Prerequisites

Create a new Loopstack project if you haven't already:

```bash
npx create-loopstack-app my-project
cd my-project
```

Start Environment

```bash
cd my-project
docker compose up -d
```

### Add the Module

```bash
loopstack add @loopstack/prompt-structured-output-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `PromptStructuredOutputExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { DefaultWorkspace } from './default.workspace';
import { PromptStructuredOutputExampleModule } from './@loopstack/prompt-structured-output-example-workflow';

@Module({
  imports: [LoopCoreModule, PromptStructuredOutputExampleModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Register in Your Workspace

Add the workflow to your workspace class using the `@Workflow()` decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Workflow } from '@loopstack/common';
import { WorkspaceBase } from '@loopstack/core';
import { PromptStructuredOutputWorkflow } from './@loopstack/prompt-structured-output-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the structured output example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() promptStructuredOutputWorkflow: PromptStructuredOutputWorkflow;
}
```

### 3. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## How It Works

### Key Concepts

#### 1. Custom Document Schema

Define a Zod schema for the structured output:

```typescript
export const FileDocumentSchema = z.object({
  filename: z.string(),
  description: z.string().optional(),
  code: z.string(),
});
```

Create a document class that uses this schema:

```typescript
@Injectable()
@BlockConfig({
  configFile: __dirname + '/file-document.yaml',
})
@WithArguments(FileDocumentSchema)
export class FileDocument extends DocumentBase {}
```

#### 2. Document UI Configuration

Configure how the document is displayed in the UI:

```yaml
type: document

ui:
  form:
    order:
      - filename
      - description
      - code
    properties:
      filename:
        title: File Name
        readonly: true
      description:
        title: Description
        readonly: true
      code:
        title: Code
        widget: code-view
```

#### 3. Enum Arguments with Select Widget

Use Zod enums to provide a dropdown selection in the UI:

```typescript
@WithArguments(z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
}))
```

Configure the select widget in YAML:

```yaml
ui:
  form:
    properties:
      language:
        title: 'What programming language should the script be in?'
        widget: select
```

#### 4. Generating Structured Output

Use `aiGenerateDocument` with a `response.document` to get typed output:

```yaml
- tool: aiGenerateDocument
  args:
    llm:
      provider: openai
      model: gpt-4o
    response:
      document: fileDocument
    prompt: |
      Create a {{ args.language }} script that prints 'Hello, World!' to the console.
      Wrap the code in triple-backticks.
  assign:
    file: ${ result.data.content }
```

The LLM response is automatically parsed into the `FileDocument` schema.

#### 5. Workflow State

Use `@WithState` to define typed state that persists across transitions:

```typescript
@WithState(z.object({
  file: FileDocumentSchema,
}))
```

Access state values in subsequent transitions:

```yaml
text: |
  Successfully generated: {{ file.description }}
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateDocument` tool and `AiMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
