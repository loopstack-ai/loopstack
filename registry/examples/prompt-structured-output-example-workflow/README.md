# @loopstack/prompt-structured-output-example-workflow

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides an example workflow demonstrating how to generate structured output from an LLM using a custom document schema.

## Overview

The Prompt Structured Output Example Workflow shows how to use the `aiGenerateDocument` tool to get structured, typed responses from an LLM. It generates a "Hello, World!" script in a user-selected programming language, with the response structured into filename, description, and code fields.

By using this workflow as a reference, you'll learn how to:

- Define custom document schemas with Zod for structured LLM output
- Use the `aiGenerateDocument` tool to generate typed responses
- Create custom documents with form configuration
- Access structured results via the `runtime` object

This example builds on the basic prompt pattern and is ideal for developers who need typed, structured responses from LLMs.

## Installation

See [SETUP.md](./SETUP.md) for installation and setup instructions.

## How It Works

### Key Concepts

#### 1. Custom Document Schema

Define a Zod schema for the structured output:

```typescript
export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

export type FileDocumentType = z.infer<typeof FileDocumentSchema>;
```

Create a document class that uses this schema with the `@Document` decorator and `@Input` for the content:

```typescript
@Document({
  configFile: __dirname + '/file-document.yaml',
})
export class FileDocument implements DocumentInterface {
  @Input({ schema: FileDocumentSchema })
  content: FileDocumentType;
}
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
@Input({
  schema: z.object({
    language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
  }),
})
args: {
  language: string;
};
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

Use `aiGenerateDocument` with a `response.document` to get typed output. The tool call is given an `id` so its result can be referenced later:

```yaml
- id: prompt
  from: ready
  to: prompt_executed
  call:
    - id: llm_call
      tool: aiGenerateDocument
      args:
        llm:
          provider: openai
          model: gpt-4o
        response:
          document: fileDocument
        prompt: |
          Create a {{ args.language }} script that prints 'Hello, World!' to the console.
          Wrap the code in triple-backticks.
```

The LLM response is automatically parsed into the `FileDocument` schema.

#### 5. Accessing Results via Runtime

Instead of using `assign` to save results to workflow state, tool results are accessed through the `runtime` object. The path follows the pattern `runtime.tools.<transitionId>.<toolCallId>.data`:

```yaml
- id: add_message
  from: prompt_executed
  to: end
  call:
    - tool: createDocument
      args:
        id: status
        document: aiMessageDocument
        update:
          content:
            role: assistant
            parts:
              - type: text
                text: |
                  Successfully generated: {{ runtime.tools.prompt.llm_call.data.content.description }}
```

The TypeScript class declares the runtime types with the `@Runtime()` decorator:

```typescript
@Runtime()
runtime: {
  tools: Record<'prompt', Record<'llm_call', ToolResult<DocumentEntity<FileDocumentType>>>>;
};
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
