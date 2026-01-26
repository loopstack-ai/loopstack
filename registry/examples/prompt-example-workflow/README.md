# @loopstack/prompt-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to integrate an LLM using a simple prompt pattern.

## Overview

The Prompt Example Workflow shows the most basic way to call an LLM in Loopstack—using a simple text prompt. It generates a haiku about a user-provided subject.

By using this workflow as a reference, you'll learn how to:

- Define workflow arguments with default values
- Use the `prompt` parameter for simple LLM calls
- Interpolate arguments into prompts using Handlebars syntax
- Display LLM responses as documents

This example is the ideal starting point for developers new to LLM integration in Loopstack.

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
loopstack add @loopstack/prompt-example-workflow
```

This copies the source files into your `src` directory.

> Using the `loopstack add` command is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `PromptExampleModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { AiModule } from '@loopstack/ai-module';
import { DefaultWorkspace } from './default.workspace';
import { PromptExampleModule } from './prompt-example-workflow';

@Module({
  imports: [LoopCoreModule, PromptExampleModule],
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
import { PromptWorkflow } from './prompt-example-workflow';

@Injectable()
@BlockConfig({
  config: {
    title: 'My Workspace',
    description: 'A workspace with the prompt example workflow',
  },
})
export class MyWorkspace extends WorkspaceBase {
  @Workflow() promptWorkflow: PromptWorkflow;
}
```

### 3. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## How It Works

### Key Concepts

#### 1. Workflow Arguments

Define input parameters with default values using `@WithArguments`:

```typescript
@WithArguments(z.object({
  subject: z.string().default("coffee"),
}))
```

Configure the UI form in YAML:

```yaml
ui:
  form:
    properties:
      subject:
        title: 'What should the haiku be about?'
```

#### 2. Simple Prompt Pattern

Use the `prompt` parameter for straightforward LLM calls without conversation history:

```yaml
- tool: aiGenerateText
  args:
    llm:
      provider: openai
      model: gpt-4o
    prompt: Write a haiku about {{ args.subject }}
```

#### 3. Argument Interpolation

Access workflow arguments in templates using `args.<name>`:

```yaml
prompt: Write a haiku about {{ args.subject }}
```

#### 4. Storing Results in State

Use `assign` to save tool results to workflow state:

```yaml
assign:
  llmResponse: ${ result.data }
```

Then reference the state in subsequent transitions:

```yaml
update:
  content: ${ llmResponse }
```

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateText` tool and `AiMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)