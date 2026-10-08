---
title: 'Introducing Loopstack v0.15'
description: 'Announcing Loopstack v0.15 with a simplified, NestJS-native architecture, improved dependency injection, stateless workflows and first-class testing utilities.'
date: '2025-12-17'
author: 'Loopstack Team'
tags: ['Release', 'v0.15']
draft: true
img: '/images/blog/release-0-15.png'
---

Today we’re releasing **Loopstack v0.15**, a major architectural update that makes Loopstack feel truly native to NestJS - while significantly improving developer experience, type safety, and testability. This release removes framework-specific complexity and embraces standard NestJS patterns throughout.

## Native NestJS Dependency Injection

Loopstack no longer relies on a custom factory service.

- Factory services are **removed**
- Modules behave like **standard NestJS modules**
- Dependency injection is handled entirely by **NestJS’s DI system**

If you know NestJS, Loopstack now feels immediately familiar.

## New Dependency Injection Model for Blocks

The old `import` config for blocks has been deprecated in favor of native DI.
We’ve introduced new decorators to make dependencies explicit and type-safe:

- `@Workflow()`
- `@Tool()`
- `@Document()`

Dependencies can be injected using standard constructors or these decorators (recommended), improving readability and maintainability.

## Arguments with `@WithArguments`

Arguments are no longer defined in block configs.
Instead, use the new `@WithArguments` decorator:

- Defined with **Zod schemas**
- Provides compile-time type safety
- Works across workflows, tools, and documents

## Workflow State with `@WithState`

Workflow state is now defined separately using the new `@WithState` decorator:

- State is defined via Zod schemas
- Workflows themselves are now **stateless**

This enables a cleaner separation of concerns and more predictable execution.

## Helper Methods in Templates

With the new `@Helper` decorator, you can expose TypeScript methods directly to YAML templates:

- Call helpers from templates
- Move complex logic out of YAML

## Leaner Core & Better Testing

Loopstack core has been streamlined:

- Smaller, more focused core
- Tools and documents moved into separate packages
- Modular, opt-in functionality

We’ve also added **first-class testing utilities**:

- Test full workflow state machines
- Assert tool calls and transitions
- Validate automation logic with confidence

## Getting Started

Loopstack 0.15 is a big step toward a more intuitive, NestJS-native framework for AI automations.
Check the updated documentation for migration guidance and examples. We’re excited to see what you build with it.

_— Your Loopstack Team_
