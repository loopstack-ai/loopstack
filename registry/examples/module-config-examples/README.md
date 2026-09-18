---
title: Module Config Examples
description: Workflow examples for configurable NestJS modules in Loopstack — the forRoot/forFeature convention, per-module config isolation, and passing config through a wrapper module.
---

# @loopstack/module-config-examples

> Configurable-module examples for the [Loopstack](https://loopstack.ai) automation framework.

Loopstack feature modules follow the NestJS `forRoot` / `forFeature` convention: `forRoot(config)` is called
once in the root module and sets the global default; `forFeature(config)` is imported by a feature module and
overrides that default **for that module's providers only**. This package builds a tiny configurable module
(`GreeterModule`) and four consumers, so you can see each case side by side and copy the shape for your own.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/module-config-examples src/module-config-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ModuleConfigExamplesModule } from './module-config-examples/module-config-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), ModuleConfigExamplesModule],
})
export class AppModule {}
```

`ModuleConfigExamplesModule` calls `GreeterModule.forRoot({ language: 'en', greeting: 'Hello' })` itself, so
the example is self-contained. In your own app the `forRoot` call belongs in your root `AppModule`.

## Install as a Dependency

```bash
npm install @loopstack/module-config-examples
```

```typescript
import { ModuleConfigExamplesModule } from '@loopstack/module-config-examples';
```

No secrets or environment variables are needed.

## Examples

| Example             | Studio title                      | Run                              | Greets with      |
| ------------------- | --------------------------------- | -------------------------------- | ---------------- |
| [Default](#default) | `Module Config - Default Example` | `loopstack run default_greeting` | `Hello` (`en`)   |
| [German](#german)   | `Module Config - German Example`  | `loopstack run german_greeting`  | `Hallo` (`de`)   |
| [French](#french)   | `Module Config - French Example`  | `loopstack run french_greeting`  | `Bonjour` (`fr`) |
| [Nested](#nested)   | `Module Config - Nested Example`  | `loopstack run nested_greeting`  | `Hola` (`es`)    |

---

## The configurable module

`GreeterModule` is the thing being configured. It is the pattern in miniature:

- An injection token and a config interface (`GREETER_CONFIG`, `GreeterConfig`).
- A `@Global` internal root module that provides the defaults, kept as a **separate class** so NestJS does
  not deduplicate it against `forFeature()` imports.
- `forRoot(config)` — registers that root module globally with the app-wide config.
- `forFeature(config)` — a module-scoped override. It exports both its tools **and** `GREETER_CONFIG`, so a
  wrapper module that declares its own tools can resolve the scoped config instead of silently falling back
  to the global default.

`GreeterTool` reads the config with `@Inject(GREETER_CONFIG)` and reports which one it got, which is how each
scenario below makes its wiring visible.

### Files

- `greeter/greeter.constants.ts` — the token and config interface
- `greeter/greeter.module.ts` — `forRoot` / `forFeature`
- `greeter/greeter.tool.ts` — the tool that consumes the config
- `greeter/greeter-agent.module.ts` — a wrapper module that passes config through (see [Nested](#nested))

## Default

No `forFeature` import at all. `GreeterTool` resolves from the global root module, so the workflow gets
whatever `forRoot` set.

### Files

- `workflows/default-greeting/`

## German

`GermanGreetingModule` imports `GreeterModule.forFeature({ language: 'de', greeting: 'Hallo' })`. Its
workflow gets the module-scoped tool; the rest of the app is unaffected.

### Files

- `workflows/german-greeting/`

## French

The same override with a different config, running alongside the German one — which is the point: two
sibling modules keep independent configs, and neither leaks into the other or into the global default.

### Files

- `workflows/french-greeting/`

## Nested

Config passed through a wrapper. `GreeterAgentModule.forFeature({ greeter: {...} })` forwards its config to
`GreeterModule.forFeature(...)` internally — the same shape as `AgentModule.forFeature` forwarding to
`LlmProviderModule.forFeature`. Reach for this when your module wraps another configurable module and wants
to expose a single `forFeature` to its consumers.

### Files

- `workflows/nested-greeting/`
- `greeter/greeter-agent.module.ts`

## Tests

```bash
npm test
```

Which config a module resolves is a dependency-injection question, so the spec boots the real app module and
pulls each workflow from **its own** injector before running it. (Registering a workflow at the test root
instead — which is what `runWorkflow` does — makes every `forFeature` override invisible, because the global
`forRoot` config always wins there.)

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
