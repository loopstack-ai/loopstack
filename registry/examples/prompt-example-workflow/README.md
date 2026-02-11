# @loopstack/prompt-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to integrate an LLM using a simple prompt pattern.

## Overview

The Prompt Example Workflow shows the most basic way to call an LLM in Loopstack—using a simple text prompt. It generates a haiku about a user-provided subject.

By using this workflow as a reference, you'll learn how to:

- Define workflow input arguments with default values
- Use the `prompt` parameter for simple LLM calls
- Interpolate arguments into prompts using template syntax
- Access tool results via the `runtime` object
- Display LLM responses as documents

This example is the ideal starting point for developers new to LLM integration in Loopstack.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/prompt-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/prompt-example-workflow
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Configure API Key

Set your OpenAI API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

### 2. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `PromptExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `PromptWorkflow` workflow to your workspace class using the `@InjectWorkflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Key Concepts

#### 1. Workflow Input

Define input parameters with default values using `@Input`:

```typescript
@Input({
  schema: z.object({
    subject: z.string().default('coffee'),
  }),
})
args: {
  subject: string;
};
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

Use the `prompt` parameter for straightforward LLM calls without conversation history. The tool call is given an `id` so its result can be referenced later:

```yaml
- id: prompt
  from: start
  to: prompt_executed
  call:
    - id: llm_call
      tool: aiGenerateText
      args:
        llm:
          provider: openai
          model: gpt-4o
        prompt: Write a haiku about {{ args.subject }}
```

#### 3. Accessing Results via Runtime

Instead of using `assign` to save results to workflow state, tool results are accessed through the `runtime` object. The path follows the pattern `runtime.tools.<transitionId>.<toolCallId>.data`:

```yaml
- id: add_response
  from: prompt_executed
  to: end
  call:
    - tool: createDocument
      args:
        document: aiMessageDocument
        update:
          content: ${{ runtime.tools.prompt.llm_call.data }}
```

The TypeScript class declares the runtime types with the `@Runtime()` decorator:

```typescript
@Runtime()
runtime: {
  tools: Record<'prompt', Record<'llm_call', AiMessageDocumentContentType>>;
};
```

#### 4. Argument Interpolation

Access workflow arguments in templates using `args.<name>`:

```yaml
prompt: Write a haiku about {{ args.subject }}
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
