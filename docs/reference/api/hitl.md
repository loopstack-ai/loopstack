---
title: API: @loopstack/hitl
description: Public API reference for @loopstack/hitl
includeInLlmsFullTxt: false
---

# API: @loopstack/hitl

## Classes

### AskClarificationTool

Tool that asks the user a clarification question and waits for their answer.

Runs the `AskUserWorkflow` as an inline sub-workflow in `text`, `options`, or
`confirm` mode, pausing the agent loop until the user responds. Returns an
`AskClarificationResult`.

```ts
import { AskClarificationTool } from '@loopstack/hitl';
```

**Provided by:** `HitlModule`

```ts
export class AskClarificationTool extends BaseTool<AskClarificationInput, object, AskClarificationResult> {
  constructor(askUserWorkflow: AskUserWorkflow);
  protected handle(
    args: AskClarificationInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<AskClarificationResult>>;
  complete(result: Record<string, unknown>): Promise<ToolEnvelope<AskClarificationResult>>;
}
```

### AskForApprovalTool

Tool that presents a concept to the user for approval and waits for their decision.

Runs the `ConfirmUserWorkflow` as an inline sub-workflow, rendering the `concept`
markdown with a confirm button and pausing the agent loop until the user approves or
denies. Returns an `AskForApprovalResult`.

```ts
import { AskForApprovalTool } from '@loopstack/hitl';
```

**Provided by:** `HitlModule`

```ts
export class AskForApprovalTool extends BaseTool<AskForApprovalInput, object, AskForApprovalResult> {
  constructor(confirmUserWorkflow: ConfirmUserWorkflow);
  protected handle(
    args: AskForApprovalInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<AskForApprovalResult>>;
  complete(result: Record<string, unknown>): Promise<ToolEnvelope<AskForApprovalResult>>;
}
```

### AskUserConfirmDocument

Document that presents a yes/no question to the user and captures their answer.

```ts
import { AskUserConfirmDocument } from '@loopstack/hitl';
```

```ts
export class AskUserConfirmDocument {
  question: string;
  answer?: string;
}
```

### AskUserDocument

Document that presents a free-text question to the user and captures their answer.

```ts
import { AskUserDocument } from '@loopstack/hitl';
```

```ts
export class AskUserDocument {
  question: string;
  answer?: string;
}
```

### AskUserOptionsDocument

Document that presents a question with a list of options for the user to pick from,
optionally allowing a custom answer.

```ts
import { AskUserOptionsDocument } from '@loopstack/hitl';
```

```ts
export class AskUserOptionsDocument {
  question: string;
  options: string[];
  allowCustomAnswer?: boolean;
  answer?: string;
}
```

### AskUserWorkflow

Workflow that presents a question to the user and waits for their answer.

Takes a `question` plus an optional `mode` of `text` (free-text, the default), `options`
(pick from the supplied `options`, optionally allowing a custom answer), or `confirm` (yes/no).
Renders the matching document, blocks on the user's input, and publishes the result as `{ answer }`.

```ts
import { AskUserWorkflow } from '@loopstack/hitl';
```

**Provided by:** `HitlModule`

```ts
export class AskUserWorkflow extends BaseWorkflow<AskUserArgs> {
  start(state: AskUserState, ctx: RunContext<AskUserArgs>): void;
  showQuestionOptions(state: AskUserState): Promise<void>;
  showQuestionConfirm(state: AskUserState): Promise<void>;
  showQuestionText(state: AskUserState): Promise<void>;
  userAnswered(
    state: AskUserState,
    input: TransitionInput<{
      answer: string;
    }>,
  ): Promise<void>;
}
```

### ConfirmUserDocument

Document that presents markdown content to the user for an approve/deny decision.

```ts
import { ConfirmUserDocument } from '@loopstack/hitl';
```

```ts
export class ConfirmUserDocument {
  markdown: string;
}
```

### ConfirmUserWorkflow

Workflow that presents markdown content to the user and waits for an approve/deny decision.

Renders the `markdown` argument as a confirmation document, then blocks until the user
responds. Publishes the result as `{ confirmed, markdown }`, where `confirmed` is `true`
when approved and `false` when denied.

```ts
import { ConfirmUserWorkflow } from '@loopstack/hitl';
```

**Provided by:** `HitlModule`

```ts
export class ConfirmUserWorkflow extends BaseWorkflow<ConfirmUserArgs> {
  showContent(state: ConfirmUserState, ctx: RunContext<ConfirmUserArgs>): Promise<void>;
  userConfirmed(state: ConfirmUserState): void;
  userDenied(state: ConfirmUserState): void;
}
```

### HitlModule

NestJS module that provides human-in-the-loop workflows and tools — the
`AskUserWorkflow` and `ConfirmUserWorkflow` sub-workflows plus the
`AskClarificationTool` and `AskForApprovalTool` — letting agents pause to
gather user input or approval.

Registration:

- `HitlModule` (bare import) — registers and exports the workflows and tools.
  There is no `forRoot` / `forFeature`; a plain import is all that is needed.

Requires: nothing beyond importing the module.

```ts
import { HitlModule } from '@loopstack/hitl';
```

```ts
export class HitlModule {}
```

## Type Aliases

### AskUserArgs

Args for `AskUserWorkflow` (passed to `run()`).

Holds `question`, optional `mode`, `options`, and `allowCustomAnswer`.

```ts
import { AskUserArgs } from '@loopstack/hitl';
```

```ts
export type AskUserArgs = z.infer<typeof AskUserArgsSchema>;
```

### ConfirmUserArgs

Args for `ConfirmUserWorkflow` (passed to `run()`).

Holds the `markdown` content presented for approval.

```ts
import { ConfirmUserArgs } from '@loopstack/hitl';
```

```ts
export type ConfirmUserArgs = z.infer<typeof ConfirmUserArgsSchema>;
```

## Variables

### AskUserAnswerSchema

Zod schema for the answer `AskUserWorkflow` waits on (the user's reply).

```ts
import { AskUserAnswerSchema } from '@loopstack/hitl';
```

```ts
AskUserAnswerSchema: z.ZodObject<
  {
    answer: z.ZodString;
  },
  z.core.$strip
>;
```

### AskUserArgsSchema

Zod schema for `AskUserWorkflow` args (what callers pass to `run()`).

```ts
import { AskUserArgsSchema } from '@loopstack/hitl';
```

```ts
AskUserArgsSchema: z.ZodObject<
  {
    question: z.ZodString;
    mode: z.ZodOptional<
      z.ZodEnum<{
        options: 'options';
        text: 'text';
        confirm: 'confirm';
      }>
    >;
    options: z.ZodOptional<z.ZodArray<z.ZodString>>;
    allowCustomAnswer: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
```

### ConfirmUserArgsSchema

Zod schema for `ConfirmUserWorkflow` args (what callers pass to `run()`).

```ts
import { ConfirmUserArgsSchema } from '@loopstack/hitl';
```

```ts
ConfirmUserArgsSchema: z.ZodObject<
  {
    markdown: z.ZodString;
  },
  z.core.$strip
>;
```
