# @loopstack/custom-tool-example-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides a complete example demonstrating how to implement and use custom tools in a Loopstack workflow.

## Overview

Custom tools are the building blocks of Loopstack automations. This module serves as a hands-on reference for developers learning how to extend Loopstack with their own functionality.

By exploring this example, you'll understand:

- How to create tools that perform specific tasks within workflows
- The difference between stateless and stateful tools
- How to use dependency injection to keep tools modular and testable
- How to wire tools into workflows using YAML configuration
- How to structure and export a reusable module

This is a great starting point before building your own custom tools.

## Installation

You can add this module using the `loopstack` cli or via `npm`.

### a) Add Sources via `loopstack add` (recommended)

```bash
loopstack add @loopstack/custom-tool-example-module
```

This command copies the source files into your `src` directory.

- It is a great way to explore the code to learn new concepts or add own customizations
- It will set up the module for you, so you do not need to manually update your application

### b) Install via `npm install`

```bash
npm install --save @loopstack/custom-tool-example-module
```

Use npm install if you want to use and maintain the module as node dependency.

- Use this, if you do not need to make changes to the code or want to review the source code.

## Setup

### 1. Manual setup (optional)

> This step is automatically done for you when using the `loopstack add` command.

- Add `CustomToolModule` to the imports of `default.module.ts` or any other custom module.
- Inject the `CustomToolExampleWorkflow` workflow to your workspace class using the `@Workflow()` decorator.

See here for more information about working with [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces)
