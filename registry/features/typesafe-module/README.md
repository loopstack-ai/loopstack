---
title: TypeSafe Module
description: Typed decisions and classifications with TypeSafe AI. Ask yes/no, choice and score questions about any state from a workflow or agent and get probabilities back.
---

# @loopstack/typesafe-module

Answers named questions about a state with [TypeSafe AI](https://typesafe.ai) (`jev` models). Use it for decisions
and classifications: yes/no (`noul`), pick-one-label (`choice`) and rubric (`score`) questions.

## Installation

```sh
npm install @loopstack/typesafe-module
```

Register the module in your app module:

```ts
import { Module } from '@nestjs/common';
import { TypeSafeModule } from '@loopstack/typesafe-module';

@Module({
  imports: [TypeSafeModule],
})
export class AppModule {}
```

Provide the API key. The model defaults to `TYPESAFE_DEFAULT_MODEL`, then `jev-latest`:

```env
TYPESAFE_API_KEY=...
```

## From a workflow: `typesafe_system_one`

Inject `TypeSafeSystemOneTool` and build questions with the `noul`, `choice` and `score` helpers:

```ts
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import { TypeSafeSystemOneTool, choice, noul, score } from '@loopstack/typesafe-module';

@Workflow({ title: 'Triage' })
export class TriageWorkflow extends BaseWorkflow {
  constructor(private readonly typesafe: TypeSafeSystemOneTool) {
    super();
  }

  @Transition({ to: 'end' })
  async triage() {
    const { data } = await this.typesafe.call(
      {
        state: { ticket: 'I was charged twice. Please fix this ASAP.' },
        questions: {
          category: choice('What is this ticket about?', { billing: null, technical: null, other: null }),
          urgent: noul('Does the customer need a reply today?'),
          tone: score('How upset is the customer?', ['calm', 'annoyed', 'angry']),
        },
      },
      { config: { model: 'jev-latest' } },
    );

    const category = data.answers.category;
    if (category.type === 'choice') {
      this.setResult({ category: category.choice, confidence: category.confidence });
    }
  }
}
```

The result is `{ model, answers, usage }`, with one answer per question name:

| Question | Answer                                                        |
| -------- | ------------------------------------------------------------- |
| `noul`   | `{ type: 'noul', noul }` — probability of yes, 0 to 1         |
| `choice` | `{ type: 'choice', choice, confidence, probabilities }`       |
| `score`  | `{ type: 'score', score, confidence, legend, probabilities }` |

The metadata is `{ provider: 'typesafe', model, usage: { inputTokens, outputTokens } }`.

Agents can call the tool too: list `typesafe_system_one` in an LLM call's `tools`.

## Label-typed answers: `TypeSafeClientService`

The tool validates at runtime, so its answers are typed per question kind (`choice: string`). When you want
answer types inferred from your own labels, inject `TypeSafeClientService` and call `systemOne()` directly:

```ts
const { answers } = await this.typesafeClient.systemOne({
  state: 'I was charged twice.',
  questions: { category: choice('What is this ticket about?', { billing: null, other: null }) },
});
answers.category.choice; // 'billing' | 'other'
```

## Configuration

| Config      | Default                                     | Description                             |
| ----------- | ------------------------------------------- | --------------------------------------- |
| `model`     | `TYPESAFE_DEFAULT_MODEL`, then `jev-latest` | Model that answers the questions        |
| `envApiKey` | `TYPESAFE_API_KEY`                          | Name of the env var holding the API key |

API failures surface as the SDK's error classes (`RateLimitError`, `AuthenticationError`, …), which this package
re-exports.
