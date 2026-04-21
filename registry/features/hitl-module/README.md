# @loopstack/hitl

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

Human-in-the-loop (HITL) building blocks for Loopstack workflows. Pause a running workflow, ask the user a question, and resume once they answer.

## Overview

Most non-trivial workflows need a human decision at some point — "is this the right file?", "do you want to proceed?", "pick one of these options". This module provides two ready-to-use workflows that handle the wait-for-user pattern, along with the document types that render the prompts in the UI.

By using this module you'll get:

- **`AskUserWorkflow`** — asks a free-text question, a yes/no confirmation, or a multiple-choice question (mode is a runtime arg)
- **`ConfirmUserWorkflow`** — shows markdown content and waits for a confirm / deny response
- **4 document types** that render the prompts: `AskUserDocument`, `AskUserConfirmDocument`, `AskUserOptionsDocument`, `ConfirmUserDocument`

## Installation

```sh
npm install @loopstack/hitl
```

Register the module:

```ts
import { HitlModule } from '@loopstack/hitl';

@Module({
  imports: [HitlModule /* ... */],
})
export class AppModule {}
```

## How It Works

### Asking a text question as a sub-workflow

Use `@InjectWorkflow()` to launch `AskUserWorkflow` from a parent workflow. The call resolves with the user's answer once they respond in the UI:

```ts
import { BaseWorkflow, InjectWorkflow, Transition, Workflow } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';

@Workflow({ uiConfig: __dirname + '/my.ui.yaml' })
export class MyWorkflow extends BaseWorkflow {
  @InjectWorkflow() askUser: AskUserWorkflow;

  @Transition({ from: 'ready', to: 'done' })
  async collectName() {
    const { answer } = await this.askUser.run({ question: 'What is your name?' }, { alias: 'askName' });
    // use `answer`
  }
}
```

### Multiple-choice and confirmation modes

`AskUserWorkflow` takes an optional `mode`:

```ts
await this.askUser.run({
  question: 'Which environment?',
  mode: 'options',
  options: ['staging', 'production'],
  allowCustomAnswer: false,
});

await this.askUser.run({
  question: 'Proceed with deletion?',
  mode: 'confirm',
});
```

### Showing long-form content for confirmation

`ConfirmUserWorkflow` is for "review and confirm" flows where you want to render markdown (e.g. a summary) and get a confirm / deny response:

```ts
import { ConfirmUserWorkflow } from '@loopstack/hitl';

const { confirmed } = await this.confirmUser.run({
  markdown: '## About to commit\n\n- 3 files changed',
});
```

### Documents

Each workflow saves one of the document types on the workflow repository — the Studio UI picks up those documents and renders the corresponding input widget. You generally don't need to interact with the document classes directly, but they're exported if you want to query or post-process answers.

## Public API

- **Module:** `HitlModule`
- **Workflows:** `AskUserWorkflow`, `ConfirmUserWorkflow`
- **Documents:** `AskUserDocument`, `AskUserConfirmDocument`, `AskUserOptionsDocument`, `ConfirmUserDocument`

## Dependencies

- `@loopstack/common` — `BaseWorkflow`, decorators
- `@loopstack/core` — `LoopCoreModule`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
