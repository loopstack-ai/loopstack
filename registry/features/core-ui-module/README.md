# @loopstack/core-ui-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides tools and document types for creating UI elements that render in Loopstack Studio.

## Overview

The Core UI Module enables workflows to create structured documents that display as interactive UI components. It includes the `CreateDocument` tool along with predefined document types for common use cases.

By using this module, you'll be able to:

- Create documents that render as UI widgets in Loopstack Studio
- Display chat-style messages with role and content
- Show formatted markdown content
- Present error messages with appropriate styling
- Output plain text displays

This module is essential for workflows that need to present information to users through the Loopstack Studio interface.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/core-ui-module
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/core-ui-module
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `CoreUiModule` to the imports of `default.module.ts` or any other custom module.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)

### 2. Use in Your Workflow

Inject the tool and documents in your workflow class:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Document, InjectTool } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import {
  CreateDocument,
  ErrorDocument,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
} from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow extends WorkflowBase {
  // Tool
  @InjectTool() createDocument: CreateDocument;

  // Documents
  @InjectDocument() messageDocument: MessageDocument;
  @InjectDocument() markdownDocument: MarkdownDocument;
  @InjectDocument() errorDocument: ErrorDocument;
  @InjectDocument() plainDocument: PlainDocument;
}
```

And use them in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  - id: show_response
    from: start
    to: end
    call:
      - tool: createDocument
        args:
          document: messageDocument
          update:
            content:
              role: 'assistant'
              content: 'Hello! How can I help you today?'
```

## Tool Reference

### CreateDocument

Creates a document instance that renders as a UI widget in Loopstack Studio.

#### Arguments

| Argument   | Type                               | Required | Description                                                         |
| ---------- | ---------------------------------- | -------- | ------------------------------------------------------------------- |
| `document` | string                             | Yes      | Name of the document type to create                                 |
| `id`       | string                             | No       | Custom identifier for the document (auto-generated if not provided) |
| `validate` | `'strict'` \| `'safe'` \| `'skip'` | No       | Schema validation mode (default: `'strict'`)                        |
| `update`   | object                             | No       | Override document configuration, including content                  |

#### Validation Modes

- **`strict`** (default): Throws an error if content doesn't match the document schema
- **`safe`**: Validates content but continues with partial data on failure
- **`skip`**: Bypasses schema validation entirely

## Document Types

### MessageDocument

Displays a chat-style message with role and content. Useful for conversational interfaces.

**Schema:**

```typescript
{
  role: string; // e.g., 'assistant', 'user', 'system'
  content: string; // The message text
}
```

**Example:**

```yaml
- tool: createDocument
  args:
    document: messageDocument
    update:
      content:
        role: 'assistant'
        content: 'This is a chat message'
```

### MarkdownDocument

Renders formatted markdown content with full styling support.

**Schema:**

```typescript
{
  markdown: string; // Markdown-formatted text
}
```

**Example:**

```yaml
- tool: createDocument
  args:
    document: markdownDocument
    update:
      content:
        markdown: |
          # Heading

          This is **bold** and `code`.
```

### ErrorDocument

Displays an error message with error-specific styling.

**Schema:**

```typescript
{
  error: string; // Error message text
}
```

**Example:**

```yaml
- tool: createDocument
  args:
    document: errorDocument
    update:
      content:
        error: 'Something went wrong'
```

### PlainDocument

Displays plain, unformatted text.

**Schema:**

```typescript
{
  text: string; // Plain text content
}
```

**Example:**

```yaml
- tool: createDocument
  args:
    document: plainDocument
    update:
      content:
        text: 'Simple text output'
```

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: Apache-2.0

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- [Getting Started with Loopstack](https://loopstack.ai/docs/getting-started)
- For more examples how to use this module look for `@loopstack/core-ui-module` in the [Loopstack Registry](https://loopstack.ai/registry)
