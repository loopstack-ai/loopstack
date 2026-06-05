# Modules & Workspaces

Loopstack uses NestJS modules to organize your application. Workflows and tools are registered as standard NestJS providers.

## Modules

A module groups related workflows, tools, and services together.

### Basic Module

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { MyTool } from './tools/my.tool';
import { MyWorkflow } from './workflows/my.workflow';

@Module({
  imports: [ClaudeModule],
  providers: [MyWorkflow, MyTool],
  exports: [MyWorkflow, MyTool],
})
export class MyFeatureModule {}
```

### Key Rules

- **`LoopCoreModule` is global** — registered once by `LoopstackModule.forRoot()`, do not import it in feature modules
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
  imports: [ClaudeModule],
  providers: [AnalyticsWorkflow, DataFetchTool],
  exports: [AnalyticsWorkflow],
})
export class AnalyticsModule {}

// notifications.module.ts
@Module({
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

## Module Configuration (`forRoot` / `forFeature`)

Many Loopstack modules support `forRoot()` and `forFeature()` for configuring defaults. This follows the standard NestJS dynamic module pattern.

- **`forRoot(config)`** — sets **global defaults** for the module. Call once in your root `AppModule`.
- **`forFeature(config)`** — **overrides defaults** for a specific feature module. Tools in that module use the override instead of the global.

```typescript
// app.module.ts — global default: all LLM calls use claude-sonnet-4-6
@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    ClaudeModule,
    MyFeatureModule,
  ],
})
export class AppModule {}

// my-feature.module.ts — this module's LLM calls use claude-opus-4-6 instead
@Module({
  imports: [LlmProviderModule.forFeature({ model: 'claude-opus-4-6' })],
  providers: [MyWorkflow],
})
export class MyFeatureModule {}
```

Modules that support this pattern include `LlmProviderModule`, `RemoteClientModule`, `SecretsModule`, and others. Per-call config (via `options.config`) always takes priority over module defaults.

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

- [chat-example-workflow](https://loopstack.ai/registry/loopstack-chat-example-workflow) — Example module with ClaudeModule import
- [custom-tool-example-module](https://loopstack.ai/registry/loopstack-custom-tool-example-module) — Module with custom tools, services, and workflow providers
- [run-sub-workflow-example](https://loopstack.ai/registry/loopstack-run-sub-workflow-example) — Module registering both parent and sub-workflow providers
