# @loopstack/tool-call-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to enable LLM tool calling (function calling) with custom tools.

## Overview

The Tool Call Example Workflow shows how to build agentic workflows where the LLM can invoke custom tools and receive their results. It demonstrates this by asking about the weather in Berlin, where the LLM calls a `getWeather` tool to fetch the information.

By using this workflow as a reference, you'll learn how to:

- Create custom tools that the LLM can invoke
- Pass tools to the LLM using the `tools` parameter
- Use helper functions for conditional routing
- Handle tool call responses with `delegateToolCall`
- Access tool results via the `runtime` object
- Build agentic loops that continue until the LLM has a final answer

This example is essential for developers building AI agents that need to interact with external systems or APIs.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/tool-call-example-workflow
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/tool-call-example-workflow
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

- Add `ToolCallingExampleModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `ToolCallWorkflow` workflow to your workspace class using the `@InjectWorkflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

## How It Works

### Key Concepts

#### 1. Creating Custom Tools

Define a tool using the `@Tool` decorator with a description and `@Input` for the argument schema:

```typescript
@Tool({
  config: {
    description: 'Retrieve weather information.',
  },
})
export class GetWeather implements ToolInterface {
  @Input({
    schema: z.object({
      location: z.string(),
    }),
  })
  async execute(): Promise<ToolResult> {
    return Promise.resolve({
      type: 'text',
      data: 'Mostly sunny, 14C, rain in the afternoon.',
    });
  }
}
```

The `description` in `@Tool` config is passed to the LLM to help it understand when to use the tool.

#### 2. Registering Tools in the Workflow

Register custom tools using the `@InjectTool()` decorator:

```typescript
@Workflow({
  configFile: __dirname + '/tool-call.workflow.yaml',
})
export class ToolCallWorkflow {
  @InjectTool() getWeather: GetWeather;
  @InjectTool() aiGenerateText: AiGenerateText;
  @InjectTool() delegateToolCall: DelegateToolCall;
  // ...
}
```

#### 3. Passing Tools to the LLM

Provide tools to the LLM via the `tools` parameter. The tool call is given an `id` so its result can be referenced through the `runtime` object. Multiple calls within the same transition can reference earlier results:

```yaml
- id: llm_turn
  from: ready
  to: prompt_executed
  call:
    - id: llm_call
      tool: aiGenerateText
      args:
        llm:
          provider: openai
          model: gpt-4o
        messagesSearchTag: message
        tools:
          - getWeather

    - tool: createDocument
      args:
        id: ${{ runtime.tools.llm_turn.llm_call.data.id }}
        document: aiMessageDocument
        update:
          content: ${{ runtime.tools.llm_turn.llm_call.data }}
```

The LLM will decide whether to call a tool based on the user's request. The LLM response is immediately stored as a document using `runtime.tools.llm_turn.llm_call.data`.

#### 4. Helper Functions for Routing

Define helper functions using the `@DefineHelper()` decorator for use in conditional expressions:

```typescript
@DefineHelper()
isToolCall(message: { parts?: { type: string }[] } | null | undefined): boolean {
  return message?.parts?.some((part) => part.type.startsWith('tool-')) ?? false;
}
```

Use helpers in transition conditions, passing runtime references:

```yaml
- id: route_with_tool_calls
  from: prompt_executed
  to: ready
  if: '{{ isToolCall runtime.tools.llm_turn.llm_call.data }}'
```

#### 5. Executing Tool Calls

Use `delegateToolCall` to execute the tool the LLM requested. The result is stored via `runtime` and immediately saved as a document:

```yaml
- id: route_with_tool_calls
  from: prompt_executed
  to: ready
  if: '{{ isToolCall runtime.tools.llm_turn.llm_call.data }}'
  call:
    - id: delegate
      tool: delegateToolCall
      args:
        message: ${{ runtime.tools.llm_turn.llm_call.data }}

    - tool: createDocument
      args:
        id: ${{ runtime.tools.route_with_tool_calls.delegate.data.id }}
        document: aiMessageDocument
        update:
          content: ${{ runtime.tools.route_with_tool_calls.delegate.data }}
```

#### 6. Runtime Type Declarations

The `@Runtime()` decorator provides typed access to tool results across transitions:

```typescript
@Runtime()
runtime: {
  tools: {
    llm_turn: {
      llm_call: AiMessageDocumentContentType;
    };
    route_with_tool_calls: {
      delegate: AiMessageDocumentContentType;
    };
  };
};
```

#### 7. Agentic Loop Pattern

The workflow implements an agentic loop:

1. **LLM Turn** - The LLM processes messages and may request a tool call
2. **Route with Tool Calls** - If the LLM requested a tool, execute it and loop back
3. **Route without Tool Calls** - If no tool call, the LLM has finished and the workflow ends

```yaml
- id: route_with_tool_calls
  from: prompt_executed
  to: ready # Loop back for another LLM turn
  if: '{{ isToolCall runtime.tools.llm_turn.llm_call.data }}'

- id: route_without_tool_calls
  from: prompt_executed
  to: end # Workflow complete
```

This pattern allows the LLM to make multiple tool calls before providing a final response.

## Dependencies

This workflow uses the following Loopstack modules:

- `@loopstack/core` - Core framework functionality
- `@loopstack/core-ui-module` - Provides `CreateDocument` tool
- `@loopstack/ai-module` - Provides `AiGenerateText`, `DelegateToolCall` tools and `AiMessageDocument`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- Find more Loopstack examples in the [Loopstack Registry](https://loopstack.ai/registry)
