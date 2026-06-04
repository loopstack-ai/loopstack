# Modules & Workspaces

Loopstack uses NestJS modules to organize your application. Workflows and tools are registered as standard NestJS providers.

## Modules

A module groups related workflows, tools, and services together.

### Basic Module

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { MyTool } from './tools/my.tool';
import { MyWorkflow } from './workflows/my.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [MyWorkflow, MyTool],
  exports: [MyWorkflow, MyTool],
})
export class MyFeatureModule {}
```

### Key Rules

- **Always import `LoopCoreModule`** — provides core framework functionality
- **Import feature modules** like `ClaudeModule` for AI, `SandboxToolModule` for Docker sandboxes, etc.
- **Documents are NOT providers** — they are plain DTOs and don't need registration
- **Export workflows and tools** that other modules might need

### Registering in AppModule

Add your module to the main `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { MyFeatureModule } from './my-feature/my-feature.module';

@Module({
  imports: [LoopstackModule.forRoot(), MyFeatureModule],
})
export class AppModule {}
```

### Multi-Module Example

For larger applications, split functionality across modules:

```typescript
// analytics.module.ts
@Module({
  imports: [LoopCoreModule, ClaudeModule],
  providers: [AnalyticsWorkflow, DataFetchTool],
  exports: [AnalyticsWorkflow],
})
export class AnalyticsModule {}

// notifications.module.ts
@Module({
  imports: [LoopCoreModule],
  providers: [NotificationWorkflow, EmailTool],
  exports: [NotificationWorkflow],
})
export class NotificationsModule {}

// app.module.ts
@Module({
  imports: [LoopstackModule.forRoot(), AnalyticsModule, NotificationsModule],
})
export class AppModule {}
```

## Dependency Injection

Workflows and tools use standard NestJS constructor injection:

```typescript
@Workflow({
  widget: __dirname + '/chat.ui.yaml',
})
export class ChatWorkflow extends BaseWorkflow {
  constructor(
    private readonly llmGenerateText: LlmGenerateTextTool,
    private readonly myTool: MyCustomTool,
    @Inject(TEMPLATE_RENDERER) private readonly render: TemplateRenderFn,
  ) {
    super();
  }
}
```

Sub-workflows are also injected via constructor:

```typescript
export class ParentWorkflow extends BaseWorkflow {
  constructor(private readonly subWorkflow: SubWorkflow) {
    super();
  }
}
```

## Using in Loopstack Studio

Once registered:

1. Open Loopstack Studio at `http://localhost:5173`
2. Your workspace appears in the sidebar
3. Click a workflow to create a new run
4. Fill in the input form and start the workflow

## Registry References

- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Example module with LoopCoreModule and ClaudeModule imports
- [custom-tool-example-module](https://loopstack.ai/registry/loopstack-custom-tool-example-module) — Module with custom tools, services, and workflow providers
- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Module registering both parent and sub-workflow providers
