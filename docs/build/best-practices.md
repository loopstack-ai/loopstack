---
title: Best Practices
description: Design judgment for building with Loopstack's core building blocks — workflows (scripted vs agentic, where logic belongs, state vs result vs documents, error strategy), tools (single responsibility, schema/description as the LLM contract, idempotency), documents (a user-facing surface, not a data store), and modules / Studio apps (organize by feature, @StudioApp as a deliberate boundary). The principles every developer and agent should carry into the code.
---

# Best Practices

The other guides in this section show _how_ each mechanism works. This page is about _judgment_: which concept to reach for, why, and how to keep things clean as they grow. It is the knowledge every developer — and every agent — should carry into Loopstack before writing the first line. None of it is API detail; it is the professional shape of clean Loopstack code.

The through-line for all four building blocks is the same: **optimize for legibility.** Someone reading your code should understand the system without running it.

## Workflows

A workflow is a **state machine**, and its highest virtue is legibility. Someone scanning your transitions should understand the process without executing it.

### Think in narratives, not steps

A workflow's places (states) and transitions are a story. Name them so the story reads top to bottom:

```
start → fetch_data → summarize → waiting_for_approval → publish → end
```

Good place names describe _where the workflow is_; good transition method names describe _the step being taken_ (`fetchData`, `summarize`, `publish`). When the state machine reads like prose, routing bugs become visible and onboarding is free. Avoid abstract names (`step1`, `process2`, `handlerA`) — name things for what they do, never for an invented taxonomy.

### Scripted by default; agentic only when the path is open-ended

Loopstack gives you two modes for doing work:

- **Scripted** — you write the transitions. The path is fixed and deterministic.
- **Agentic** — an `AgentWorkflow` runs an LLM tool-calling loop and _decides_ the path at runtime.

**Default to scripted.** Determinism is cheaper, faster, testable, and debuggable. Reach for an agent only when the sequence of steps genuinely cannot be known in advance — open-ended exploration, research, or tasks where the next action depends on what the previous one discovered.

The best designs are usually **hybrid**: a deterministic workflow that scaffolds the run (validate input → prepare context → _contained agent step_ → validate output → publish). The agent gets autonomy only where autonomy is needed; everything around it stays predictable. An agent is a tool you place _inside_ a clear process, not a replacement for having one.

### Thin transitions, fat tools

Logic has two homes, and putting it in the wrong one is the most common source of unmaintainable workflows.

- **Transitions orchestrate.** They decide what happens next and move state. Keep their bodies short — read inputs, call a tool or a sub-workflow, write state, done.
- **Tools do the work.** Domain logic belongs in a tool: one tool, one responsibility, a narrow Zod input schema, and a clear description.

Why this split pays off: a tool is reusable across workflows, independently testable, and — because tools carry a description and schema — it doubles as an LLM function with zero extra work. Logic inlined in a transition is none of those things.

```typescript
// Avoid: business logic living in the transition
@Transition({ from: 'ready', to: 'done' })
async process(state: MyState) {
  const rows = await db.query(...);          // domain logic
  const filtered = rows.filter(...);          // domain logic
  this.assignState({ count: filtered.length });
}

// Prefer: the transition orchestrates, the tool does the work
@Transition({ from: 'ready', to: 'done' })
async process(state: MyState) {
  const result = await this.fetchActiveUsers.call({ since: state.since });
  this.assignState({ count: result.data.length });
}
```

### Know your three data surfaces: state, result, documents

Workflows expose data in three places. Choosing the wrong one is the subtlest and most common smell.

| Surface       | What it is                                       | Use it for                                           |
| ------------- | ------------------------------------------------ | ---------------------------------------------------- |
| **State**     | Internal working memory, persisted across pauses | Intermediate values the workflow needs to do its job |
| **Result**    | The workflow's _published output_                | The contract consumers and parent workflows read     |
| **Documents** | Typed objects rendered in Studio                 | Everything the _user_ should see                     |

The rules of thumb:

- **Keep state minimal.** It is scratch space, not an output channel. If a value only matters mid-run, it stays in state and never leaves.
- **Design the result as a deliberate contract.** It is the public API of your workflow — what a parent receives in a callback, what a consumer depends on. Publish a clean, intentional shape with `setResult` / `assignResult`. Never dump raw internal state into the result.
- **Documents are for humans.** If a value needs to be _seen_, save a document. If it needs to be _consumed by code_, it belongs in the result. They are not interchangeable.

### Extract a sub-workflow for a reason, not by reflex

One readable workflow beats five fragmented ones. Split only when there is a concrete payoff:

- **Reuse** — the same unit of work is needed in more than one place.
- **Independent lifecycle or UI** — the unit pauses for its own input, or should render as its own panel/link in Studio.
- **Fan-out** — you need to run the unit in parallel or in sequence over a list.

If none of those apply, keep it inline. Premature decomposition trades one clear flow for orchestration overhead. And when you _do_ split, name the sub-workflow for what it accomplishes — never `sub-workflow-a` or `type-2-handler`.

### Pause only for genuinely external events

A `wait` transition pauses the workflow until something outside it happens: a user clicks a button, a sub-workflow completes, an API calls back. That is the _only_ reason to wait.

Never use waiting to poll or to "give something time." If you find yourself waiting and re-checking, the work should be a callback instead. Waiting is for handing control out and getting it back — not for busy-looping.

### Keep guards pure

Guards decide routing when several transitions share a `from` place. Treat them as **pure predicates over state**: they read, they return a boolean, they do nothing else.

A guard that mutates state, calls a tool, or has a side effect makes routing impossible to reason about and impossible to test in isolation. Compute the decision inputs in a transition, store them in state, and let the guard read them. The guard is the single, visible source of routing truth.

### Choose an error strategy by failure type

Not all failures are equal. Match the recovery mode to the _kind_ of failure:

| Failure kind                               | Strategy                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Transient (network blip, rate limit)       | **Auto-retry**                                                              |
| User-fixable (bad input, missing approval) | **Error place / manual retry** — surface it and let the user correct course |
| Fatal (programmer error, impossible state) | **Fail loudly** — don't paper over a bug                                    |

Then internalize the rollback reality: **when a transition throws, its state mutations roll back — but external side effects do not.** A half-sent email or a half-written file stays half-done. So design transitions to be **safe to re-run**: make side effects idempotent, or structure them so a retry can't double-apply them. Surface failures the user should see as an `ErrorDocument` rather than letting them disappear into logs.

### Treat schemas as contracts

Every boundary — workflow args, state, transition input — takes a Zod schema. Use them. A schema validates at runtime _and_ documents the shape for the next reader (human or LLM). Validated boundaries turn a class of silent, late failures into loud, early ones. The few lines a schema costs are repaid the first time bad data is rejected at the door instead of corrupting a run three steps later.

### Templates present; code decides

Handlebars templates are for assembling text — prompts, markdown, user-facing copy. Keep _decisions_ out of them. Branching, lookups, and computed values belong in TypeScript where they can be read, typed, and tested; the template just renders the result. A template that contains business logic is logic hidden where no test will find it.

### Conventions that keep workflows clean

These are project conventions; the reasons behind them are what matter:

- **Transitions return nothing — mutate via setters** (`assignState` / `setState`, `assignResult` / `setResult`). Returning a value throws at runtime. This keeps state changes explicit and uniformly rollback-able.
- **`async` only when the body awaits.** Don't decorate a synchronous transition with `async` — the linter strips unused `async`, and the intent stays honest.
- **No abstract base classes for workflow patterns.** Compose with tools and sub-workflows instead of inheritance hierarchies; the framework is built for composition.
- **Fix root causes, not symptoms.** When a workflow misbehaves, find the wrong assumption — don't add a guard or a retry to mask it.
- **No compatibility shims.** When a contract changes, update every caller. Don't leave deprecated re-exports behind.

## Tools

A tool is a reusable unit of logic with **two audiences**: your own code and the LLM that may call it as a function. Design for both.

### One tool, one responsibility

A narrow tool is reusable, composable, and — crucially — easy for an LLM to call correctly. A tool that does five things is hard to reuse and hard for a model to use right, because the model has to guess which of its behaviors you want. If a tool's description needs the word "and" several times, it should probably be several tools.

### The description and schema are the LLM's instructions

For a tool that an LLM can call, the description and Zod schema are not just documentation — they are the _only_ thing the model reads to decide **when** and **how** to call it. Write the description to state what the tool does and when to reach for it; give each field a clear, narrow type. Vague descriptions produce wrong calls. This is effort that pays back every time the model uses the tool.

### Keep tools stateless and self-contained

Everything a tool needs arrives through its `args` and the `ctx` it is handed. A tool should never reach into a particular workflow's internal state — that couples it to one caller and breaks the reuse that justified making it a tool. Same inputs should mean same behavior.

### Make tools safe to re-run

Tools get retried, and the rollback rules cover the calling transition's state — not a tool's external side effects. Design side effects to be idempotent so a retry can't double-apply them (don't charge the card twice, don't append the row twice).

### Return a clean result; fail with actionable errors

A tool's result is a contract for both code and the LLM, so return a typed, intentional shape. And when a tool errors during agent use, the message is fed back to the model so it can self-correct — so an error should say _what_ went wrong and _how_ to fix it, not just "failed."

## Documents

Documents are how a workflow talks to the **user**. They are a communication surface, not a data store.

### Documents are for humans, not for code

If a value exists so that _code_ can use it, it belongs in state or result. Save a document only for what the _user_ should see in Studio. Using a document as a place to stash data your workflow will read back later is the most common misuse — it couples your logic to the UI and clutters the run.

### Reuse built-in document types before creating a custom one

Markdown, chat messages, links, and errors already cover most needs. Create a custom document only when the _rendering_ genuinely differs — a form, a code editor, a structured display. A custom document is UI you have to maintain; don't add one just to hold plain data that a built-in type would render fine.

### Emit documents to keep a run legible

A run a user can follow in Studio is one they can trust and debug. Save the meaningful intermediate outputs, not only the final one — but don't spam: a document the user doesn't need is noise that hides the ones they do.

## Modules & Studio Apps

Modules are how you organize capability; `@StudioApp` is the user-facing boundary on top of that organization.

### Organize modules by feature, not by type

Group the workflows, tools, and services of one capability into one module. Don't create a "tools module" and a "workflows module" — that scatters a single feature across the codebase. A module should read as one cohesive thing the system can do.

### Import only what you use

A module's imports are its honest dependency list. Pull in a provider module (LLM, OAuth, sandbox, secrets) where the capability is actually needed and nowhere else. A lean, accurate import graph is one you can reason about; a kitchen-sink module hides what really depends on what.

### `@StudioApp` is a deliberate boundary, not a default

`@StudioApp` marks a module as a launchable application in Studio. Apply it only to modules meant to be run by users — without it, workflows still exist as providers but stay out of the UI, which is often exactly right for internal building blocks. Keep each app focused: a coherent set of related workflows under one clear title, not a dumping ground.

### Register a shared tool once, at the right level

Tools resolve through dependency injection at runtime, so a tool registered in a module is available to every workflow and agent in scope. Register a shared tool once where its consumers can reach it, rather than re-declaring it per workflow — that is what lets an agent and a scripted workflow use the same tool without duplication.

## Related

- [Creating Workflows](./fundamentals/workflows.md) · [Tools](./fundamentals/tools.md) · [Documents](./fundamentals/documents.md) · [Modules](./fundamentals/modules.md) · [Studio App Config](./fundamentals/studio-config.md)
- [State Management](./patterns/state-management.md) · [Error Handling](./patterns/error-handling.md) · [Sub-Workflows](./patterns/sub-workflows.md) · [Dynamic Routing](./patterns/dynamic-routing.md)
- [Agent Workflows](./ai/agent-workflows.md) — when and how to go agentic
