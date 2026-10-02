---
title: Prompt Selection Rules
description: How Studio, the CLI and TestRun.parkView() decide which prompt a waiting run shows — the shared @loopstack/contracts/park-view rules. Covers answerable states, run-tree order, evaluateWorkflowPrompts candidate order (documents before workflow widgets), DISPLAY_WIDGETS, internal/hideAtPlaces/enableAtPlaces, answered documents, widgetState with showWhen/enabledWhen, resolveSubmitTransition and the lone-transition rule, pickPrompt prompt/blocked/fallback, and the toParkView result.
---

# Prompt Selection Rules

A parked run can have several things on screen at once — a confirmation card from a sub-workflow, a chat input on the parent, a form saved two steps ago. Only one of them is _the_ prompt: the widget Studio activates, the question the CLI asks in the terminal, and the view `TestRun.parkView()` returns. All three surfaces make that choice with the same rule set from `@loopstack/contracts/park-view`, so a workflow that prompts correctly in one prompts the same way in the others. This page describes those rules, so you can predict which widget wins when a park offers more than one.

## Where the Rules Apply

| Surface                                     | What it does with the pick                                      | Widgets it can render                     |
| ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Studio** run view                         | Activates the picked widget; draws its run's controls beside it | Widgets with a Studio prompt component    |
| **CLI** (`run`, `attach`, `runs`, `answer`) | Asks, reports or answers the picked prompt from the terminal    | Widgets with a CLI collect implementation |
| **Testing** (`run.parkView()`)              | Returns the picked prompt as a `ParkView`                       | Every widget                              |

The rules themselves are the same everywhere. The surfaces differ in which widget types they can render — see [The Pick](#the-pick) — and in the order they list a workflow's documents — see [Candidate Order](#candidate-order).

## Answerable Workflows

A workflow is a prompt source only when its status is `waiting`, `paused` or `failed` **and** it has at least one available transition. A run that failed at an error place with recovery transitions is therefore answerable like any other park; a running, completed or canceled workflow contributes nothing.

## Walking the Run Tree

HITL prompts usually live on a sub-workflow, so every surface walks the whole run tree: the root workflow first, then its children breadth-first. Each workflow node produces an ordered list of candidates, and the candidates of all nodes are considered in tree order. A prompt on the root therefore wins over a prompt on a child, and a child wins over a grandchild.

## Candidate Order

Within one workflow node, candidates come in this order:

1. **Document prompts** — the workflow's documents that pass the filters below, in document order.
2. **Workflow-level widgets** — the workflow's own `ui.widgets` (chat inputs, buttons, forms), in declaration order. Widgets hidden by `showWhen` are dropped.
3. **Bare wait** — a fallback for "this workflow is waiting, but there is nothing to show".

Documents come first: when a confirmation document and a `prompt-input` widget are both active at the same place, the document is the prompt.

Studio and `parkView()` list a workflow's documents in save order; the CLI lists them newest first. With several unanswered document prompts active at the same place, the surfaces can pick different ones — keep one unanswered document prompt per park.

## Document Prompts

A document is a prompt candidate only when it passes every filter. The widget a document type renders with is the first entry of its `ui.widgets`; a document type without a widget is never a prompt.

| Filter       | A document is skipped when …                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Display-only | its widget is a display widget (table below)                                                                               |
| Visibility   | its type or the saved instance is tagged `internal`, or the current place is in its `meta.hideAtPlaces`                    |
| Activity     | it was saved at another place, and the current place is not in its `meta.enableAtPlaces`                                   |
| Answered     | its content carries an `answer` field — presence decides, not truthiness, so a recorded `answer: false` counts as answered |
| Invalidated  | it was replaced by a later save with the same `key`                                                                        |

A document is stamped with the place its transition moved the workflow to. `enableAtPlaces` adds places on top of that one: a document saved at `draft` with `enableAtPlaces: ['review']` is active at both `draft` and `review`. See [Document YAML Schema — Meta Properties](./document-yaml.md#meta-properties).

### Display Widgets

These widgets only present content. A document rendered with one of them is transcript content and never a prompt — even when the run has exactly one available transition.

`message`, `llm-message`, `ai-message`, `markdown`, `plain`, `error`, `link`, `debug`

## Widget State

Every document prompt and workflow-level widget gets a state at the current place, checked in this order:

1. `showWhen` is set and the current place is not listed → **hidden**.
2. `enabledWhen` is set and the current place is not listed → **disabled**.
3. The widget has no [submit transition](#submit-transition) → **disabled**.
4. Otherwise → **active**.

Only **active** candidates can be picked. A disabled widget is still drawn by Studio, but it is never the prompt. `showWhen` and `enabledWhen` are described in [Workflow YAML Schema](./workflow-yaml.md#enabledwhen).

## Submit Transition

The submit transition is the transition an answer resolves to. A widget declares transitions through `options.transition` and every `options.actions[].transition`.

- **Declared transitions** — the submit transition is the first declared transition that is currently available. If none of them is available, the widget is disabled.
- **No declared transition** — the widget submits to the workflow's only available transition. With zero or two-plus available transitions the target is ambiguous, and the widget is disabled.

The lone-transition rule is why a document prompt without `options.transition` works at a park with one `wait: true` transition, and turns into a disabled widget as soon as a second transition becomes available at the same place. Declare the transition on the widget when a place offers more than one.

## The Pick

The pick walks the candidates in order and reports three results:

| Result     | What it is                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `prompt`   | The first **active** document or workflow widget the surface can render. This is what the user is asked.                         |
| `blocked`  | The first active candidate the surface _cannot_ render whose widget declares its own transitions — a prompt for another surface. |
| `fallback` | The first bare wait. Used only when there is no `prompt` anywhere in the tree.                                                   |

`blocked` is how a surface tells "someone else's prompt" apart from "nothing to answer". The CLI prints `waiting for input the CLI can't collect: <widget>` with a Studio deep link — or, for widgets that resolve elsewhere, the widget's own instruction such as an OAuth sign-in URL. Studio shows a widget it has no component for as an inert card. `parkView()` renders every widget, so it never reports `blocked`. A widget with no declared transition is never `blocked`: without explicit intent it is display content, not someone else's prompt.

`fallback` is the bare wait: the run is parked with transitions available, but nothing renderable exists. Surfaces show a generic waiting line, and `parkView()` returns a view without `widget` and `documentName`.

## The Reported View

The picked candidate (or the fallback) is turned into a `ParkView`:

| Field               | Content                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `workflowId`        | The prompting workflow — often a sub-workflow. Answers are submitted against it.                                       |
| `workflowName`      | The prompting workflow's name                                                                                          |
| `place`, `status`   | The prompting workflow's current place and status                                                                      |
| `widget`            | The widget type, e.g. `text-prompt`, `confirm-prompt`, `form`. Absent for a bare wait.                                 |
| `documentName`      | The prompt document. Absent for workflow-level widgets and bare waits.                                                 |
| `content`           | The prompt document's content — the question itself                                                                    |
| `schema`            | The document's JSON schema — the shape of the expected answer                                                          |
| `options`           | The widget options (labels, choices, actions)                                                                          |
| `transitions`       | All transitions currently available on the prompting workflow                                                          |
| `defaultTransition` | The [submit transition](#submit-transition). For a bare wait it is set only when exactly one transition is available.  |
| `actions`           | For widgets with `options.actions`: the labels of the actions that are submittable now (their transition is available) |

[Testing — Asserting the park view](../build/testing.md#asserting-the-park-view) shows how to assert on this shape.

## Studio Additions

Studio draws two things around the shared pick:

- **Controls** — the other active workflow-level widgets of the run, such as the reply input at a gate or the button that leaves a loop. They are drawn beside the picked prompt instead of being hidden behind it.
- **Idle input** — when nothing is picked or blocked and a workflow is running, its first renderable workflow-level widget not hidden by `showWhen` stays on screen, disabled. This keeps the chat input visible while the agent is generating.

Neither changes which prompt is picked.
