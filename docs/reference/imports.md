---
title: Import Directory
description: Quick-reference for all @loopstack/* import paths — workflows, tools, documents, LLM providers, OAuth, sandbox, secrets, and agent module exports.
---

# Import Directory

Quick-reference for all import paths.

## `@loopstack/common`

```typescript
// Workflows
import { BaseWorkflow, Guard, QueueResult, Transition, Workflow } from '@loopstack/common';
import type { RunContext, TransitionInput } from '@loopstack/common';
// Tools
import { BaseTool, ServerTool, Tool, ToolEnvelope, ToolResult } from '@loopstack/common';
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

## `@loopstack/llm-provider`

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
} from '@loopstack/llm-provider';
```

## `@loopstack/claude`

```typescript
import { ClaudeModule } from '@loopstack/claude';
```

## `@loopstack/handoff`

```typescript
import { ChangedFilesDocument, HandoffDocument, HandoffModule, TerminalHandoffDocument } from '@loopstack/handoff';
```

## `@loopstack/openai`

```typescript
import { OpenAiModule } from '@loopstack/openai';
```

## `@loopstack/secrets`

```typescript
import { GetSecretKeysTool, RequestSecretsTask, SecretRequestDocument } from '@loopstack/secrets';
```

## `@loopstack/docker-sandbox` / `@loopstack/docker-sandbox-filesystem`

```typescript
import { SandboxCommand, SandboxDestroy, SandboxInit } from '@loopstack/docker-sandbox';
import { SandboxToolModule } from '@loopstack/docker-sandbox';
import {
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxExists,
  SandboxFileInfo,
  SandboxListDirectory,
  SandboxReadFile,
  SandboxWriteFile,
} from '@loopstack/docker-sandbox-filesystem';
import { SandboxFilesystemModule } from '@loopstack/docker-sandbox-filesystem';
```

## `@loopstack/oauth`

```typescript
import { OAuthProviderInterface, OAuthProviderRegistry, OAuthTokenStore } from '@loopstack/oauth';
import { OAuthWorkflow } from '@loopstack/oauth';
```

## `@loopstack/google-workspace`

```typescript
import { GoogleWorkspaceModule } from '@loopstack/google-workspace';
```
