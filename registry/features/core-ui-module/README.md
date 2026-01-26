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

### Install the Module

#### As Node Dependency via Npm:

```bash
npm install --save @loopstack/core-ui-module
```

#### OR: Copy Sources via Loopstack CLI

```bash
loopstack add @loopstack/core-ui-module
```



> `loopstack add` copies the source files into your `src` directory. This is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `CoreUiModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, CoreUiModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Use in Your Workflow

Inject the tool and documents in your workflow class:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Document, Tool } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import {
  CreateDocument,
  MessageDocument,
  MarkdownDocument,
  ErrorDocument,
  PlainDocument,
} from '@loopstack/core-ui-module';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
export class MyWorkflow extends WorkflowBase {
  // Tool
  @Tool() createDocument: CreateDocument;

  // Documents
  @Document() messageDocument: MessageDocument;
  @Document() markdownDocument: MarkdownDocument;
  @Document() errorDocument: ErrorDocument;
  @Document() plainDocument: PlainDocument;
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

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `document` | string | Yes | Name of the document type to create |
| `id` | string | No | Custom identifier for the document (auto-generated if not provided) |
| `validate` | `'strict'` \| `'safe'` \| `'skip'` | No | Schema validation mode (default: `'strict'`) |
| `update` | object | No | Override document configuration, including content |

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
  role: string;    // e.g., 'assistant', 'user', 'system'
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