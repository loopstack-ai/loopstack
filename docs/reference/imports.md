---
title: Import Directory
description: Quick-reference for all @loopstack/* import paths — workflows, tools, documents, LLM providers, OAuth, sandbox, secrets, and agent module exports.
---

# Import Directory

Quick-reference for all import paths.

## `@loopstack/common`

```typescript
// Workflows
import { BaseWorkflow, CallbackSchema, Guard, QueueResult, Transition, Workflow } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
// Tools
import { BaseTool, ServerTool, Tool, ToolResult } from '@loopstack/common';
import type { ToolCallOptions } from '@loopstack/common';
// Documents
import { Document, DocumentEntity } from '@loopstack/common';
// Built-in Documents
import { ErrorDocument, LinkDocument, MarkdownDocument, MessageDocument, PlainDocument } from '@loopstack/common';
// Apps
import { StudioApp } from '@loopstack/common';
```

## `@loopstack/core`

```typescript
import { LoopCoreModule } from '@loopstack/core';
import { WorkflowRunner } from '@loopstack/core';
```

## `@loopstack/llm-provider-module`

```typescript
import {
  LlmDelegateResult,
  LlmDelegateToolCallsTool,
  LlmGenerateObjectResult,
  LlmGenerateObjectTool,
  LlmGenerateTextResult,
  LlmGenerateTextTool,
  LlmMessageDocument,
  LlmProviderRegistry,
  LlmResultMeta,
  LlmUpdateToolResultTool,
} from '@loopstack/llm-provider-module';
```

## `@loopstack/claude-module`

```typescript
import { ClaudeModule } from '@loopstack/claude-module';
```

## `@loopstack/openai-module`

```typescript
import { OpenAiModule } from '@loopstack/openai-module';
```

## `@loopstack/secrets-module`

```typescript
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';
```

## `@loopstack/sandbox-tool` / `@loopstack/sandbox-filesystem`

```typescript
import {
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxExists,
  SandboxFileInfo,
  SandboxListDirectory,
  SandboxReadFile,
  SandboxWriteFile,
} from '@loopstack/sandbox-filesystem';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxCommand, SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
```

## `@loopstack/oauth-module`

```typescript
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenStore } from '@loopstack/oauth-module';
import { OAuthWorkflow } from '@loopstack/oauth-module';
```

## `@loopstack/google-workspace-module`

```typescript
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
```
