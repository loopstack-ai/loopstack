---
title: Modules & Workspaces
description: How to organize workflows, tools, and services into NestJS modules. Covers @StudioApp decorator for app identity, module structure, app modules vs feature modules, workspace configuration, forRoot/forFeature patterns, and provider registration.
---

# Modules & Workspaces

Loopstack uses NestJS modules to organize your application. Workflows and tools are registered as standard NestJS providers.

## App Modules (`@StudioApp`)

Every module whose workflows should be **visible and launchable in Loopstack Studio** must be decorated with `@StudioApp`. Without it, workflows are registered as NestJS providers but do not appear in the Studio UI.

```typescript
import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { StudioApp } from '@loopstack/common';
import { MyTool } from './tools/my.tool';
import { MyWorkflow } from './workflows/my.workflow';

@StudioApp({
  title: 'My App',
  workflows: [MyWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [MyWorkflow, MyTool],
})
export class MyAppModule {}
```

`@StudioApp` options:

- **`title`** (required) — display name shown in Studio
- **`workflows`** — array of workflow classes launchable from Studio
- **`app`** — explicit snake_case identifier (defaults to module class name with `Module` → `App`, e.g. `HelloModule` → `hello_app`, `CodeAgentModule` → `code_agent_app`)
- **`description`** — human-readable description
- **`ui`** — Studio UI options for this app. See [Studio Configuration](./studio-config.md).

> **Important:** `@StudioApp` is a metadata decorator — it does not replace `@Module`. Both decorators are required on the same class.

### Recommended File Layout

A typical app module groups workflows, tools, services, documents, and tests like this:

```
my-app/
└── src/
    ├── my-app.module.ts          # @StudioApp + @Module
    ├── index.ts                  # public exports
    ├── workflows/
    │   ├── index.ts
    │   ├── my.workflow.ts
    │   ├── my.ui.yaml            # widget config for Studio
    │   └── __tests__/
    │       └── my.workflow.spec.ts
    ├── tools/
    │   ├── index.ts
    │   ├── my.tool.ts
    │   └── __tests__/
    │       └── my.tool.spec.ts
    ├── documents/
    │   ├── my-document.ts        # @Document class
    │   └── my-document.yaml      # UI/widget metadata
    ├── services/
    │   └── my.service.ts
    └── templates/
        └── prompt.md             # Handlebars/JEXL templates
```

Conventions:

- **`__tests__/`** folder next to source for `*.spec.ts` files
- **`workflows/`, `tools/`, `documents/`, `services/`, `templates/`** as sibling folders under `src/`
- **`index.ts`** re-exports public symbols (used when this module is consumed as a package)
- Document classes (`*.ts`) and their widget config (`*.yaml`) sit side by side

Smaller modules can collapse this — a one-workflow module often keeps everything flat under `src/`. Use this layout as the upper bound, not a requirement. See the [Registry examples](https://loopstack.ai/registry) (`custom-tool-example-module`, `meeting-notes-example-workflow`) for concrete references.

### App Modules vs Feature Modules

There are two kinds of modules in a Loopstack project:

- **App modules** — decorated with `@StudioApp`, define a launchable application in Studio. They list workflows in the `workflows` array.
- **Feature modules** — plain `@Module` classes that provide reusable tools, services, or workflows. They are imported by app modules but don't appear in Studio on their own.

Registry packages (like `ClaudeModule`, `SandboxToolModule`, or example workflows) are feature modules. When you import them, you still need a `@StudioApp` module to surface their workflows in Studio.

> Feature modules are auto-discovered when reachable from a `@StudioApp` module's import graph. Some modules also opt into a Studio UI surface (panel, widget) via `forFeature()` — see [Studio Features](../../extend/features.md) for details.

> **`@StudioApp` modules must not be nested.** An app module cannot import another app module — Loopstack throws at bootstrap if it detects this. Always import each app module independently from your root `AppModule`. Shared logic belongs in plain feature modules.

## Feature Modules

A feature module groups related workflows, tools, and services together for reuse across app modules.

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

For larger applications, split functionality across app modules and shared feature modules:

```typescript
// analytics.module.ts — app module (visible in Studio)
@StudioApp({
  title: 'Analytics',
  workflows: [AnalyticsWorkflow],
})
@Module({
  imports: [ClaudeModule],
  providers: [AnalyticsWorkflow, DataFetchTool],
})
export class AnalyticsModule {}

// shared-tools.module.ts — feature module (not visible in Studio)
@Module({
  providers: [EmailTool, SlackTool],
  exports: [EmailTool, SlackTool],
})
export class SharedToolsModule {}

// notifications.module.ts — app module (visible in Studio)
@StudioApp({
  title: 'Notifications',
  workflows: [NotificationWorkflow],
})
@Module({
  imports: [SharedToolsModule],
  providers: [NotificationWorkflow],
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

Each `forFeature()` import creates an isolated scope — tools in `MyFeatureModule` see the override, while tools in any other module continue to see the global `forRoot()` default. Multiple `forFeature()` calls in different modules coexist without interfering, each with its own resolved config.

Modules that support this pattern include `LlmProviderModule`, `RemoteClientModule`, `SecretsModule`, and others. Per-call config (via `options.config`) always takes priority over module defaults.

### Creating Your Own Configurable Module

Authoring a module that supports `forRoot()` / `forFeature()` requires three pieces:

1. A **config injection token** (a `Symbol`) and a `Config` interface — so providers can `@Inject()` the resolved config.
2. A **separate `@Global()` root module** that provides the default config and exports the tools. Keeping it as its own class prevents NestJS from deduplicating it with `forFeature()` imports.
3. A **wrapper module** exposing the static `forRoot()` and `forFeature()` factories that return `DynamicModule`s with the overridden config.

```typescript
// my-feature.constants.ts
export const MY_FEATURE_CONFIG = Symbol('MY_FEATURE_CONFIG');

export interface MyFeatureConfig {
  apiKey?: string;
  region?: string;
}
```

```typescript
// my-feature.module.ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { MY_FEATURE_CONFIG, MyFeatureConfig } from './my-feature.constants.js';
import { MyTool } from './my.tool.js';

const DEFAULT_CONFIG: MyFeatureConfig = {};
const TOOLS = [MyTool];

@Global()
@Module({
  providers: [{ provide: MY_FEATURE_CONFIG, useValue: DEFAULT_CONFIG }, ...TOOLS],
  exports: [MY_FEATURE_CONFIG, ...TOOLS],
})
class MyFeatureRootModule {}

@Module({})
export class MyFeatureModule {
  static forRoot(config: MyFeatureConfig): DynamicModule {
    return {
      module: MyFeatureRootModule,
      global: true,
      providers: [{ provide: MY_FEATURE_CONFIG, useValue: config }, ...TOOLS],
      exports: [MY_FEATURE_CONFIG, ...TOOLS],
    };
  }

  static forFeature(config: MyFeatureConfig): DynamicModule {
    return {
      module: MyFeatureModule,
      imports: [MyFeatureRootModule],
      providers: [{ provide: MY_FEATURE_CONFIG, useValue: config }, ...TOOLS],
      exports: [...TOOLS],
    };
  }
}
```

Providers then inject the resolved config via the token:

```typescript
@Tool({ name: 'my_tool' })
export class MyTool extends BaseTool {
  constructor(@Inject(MY_FEATURE_CONFIG) private readonly config: MyFeatureConfig) {
    super();
  }
}
```

The `forFeature()` import of `MyFeatureRootModule` ensures the global default is always available — bare `import MyFeatureModule` works even if `forRoot()` was never called.

**Why `@Global()`?** The `@Global()` decorator is a [standard NestJS feature](https://docs.nestjs.com/modules#global-modules) that makes a module's exports available to every other module in the application without an explicit `imports: [...]` entry. The root module uses it so that `MY_FEATURE_CONFIG` and the tools are injectable anywhere — including in modules that never call `forRoot()` or `forFeature()`. This is also why `LoopCoreModule` is marked global by `LoopstackModule.forRoot()`. Use `@Global()` sparingly for app-wide singletons; prefer per-module imports for scoped behavior.

See [module-config-example](https://loopstack.ai/registry/loopstack-module-config-example) for a complete runnable example, including a nested wrapper module that passes config through to the underlying configurable module.

## Dependency Injection

Workflows and tools use standard NestJS constructor injection:

```typescript
@Workflow({
  widget: './chat.ui.yaml',
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
