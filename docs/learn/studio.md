---
title: Loopstack Studio
description: The built-in web UI for starting workflow runs, interacting with paused workflows, watching live execution, inspecting documents, and monitoring run history.
---

# Loopstack Studio

Loopstack Studio is the web UI that ships with every Loopstack installation. It lets you start workflow runs, interact with paused workflows, watch live execution, and monitor run history — all without writing any frontend code.

Studio is available at `http://localhost:5173` when running the Docker Compose setup from Getting Started.

## Who It's For

Studio is useful both during development and in production:

- **During development** — Start runs, inspect document output, trigger wait transitions, and debug state machine flows without touching an API client.
- **In production** — Studio can serve as the primary interface for internal teams. Employees can launch workflows, review AI-generated output, approve HITL decisions, and monitor execution status. It is not designed as a public-facing user interface, but it is a fully capable internal operations tool.

---

## Navigation

Studio has four main sections, accessible from the top navigation:

| Section          | URL             | What it shows                                        |
| ---------------- | --------------- | ---------------------------------------------------- |
| **Home**         | `/`             | Recent runs and paused workflows needing attention   |
| **Applications** | `/applications` | All registered apps and their available workflows    |
| **Workspaces**   | `/workspaces`   | All workspaces — one per user/context                |
| **Runs**         | `/runs`         | Complete list of all workflow runs across workspaces |

There is also an **Action Required** view at `/runs/action-required` that filters runs to only those paused and waiting for user input.

---

## Starting a Run

Click **New Run** from the Home page or the Runs list. A step-by-step dialog opens:

1. **Select Workspace** — Pick an existing workspace or create a new one. A workspace is the runtime container for a set of workflow runs, tied to an app.
2. **Select Workflow** — Choose from the workflows registered in that workspace's app. Each option shows the workflow's title and description.
3. **Configuration** — If the workflow has an input schema (`@Workflow({ schema })`), a form is generated automatically from it. Fill in the arguments and click **Run Now**.

The run starts immediately and Studio navigates to the Workbench view for that run.

---

## The Workbench — Live Run View

When you open a workflow run, you see the **Workbench**. This is where you interact with and monitor a running workflow.

### Document Feed

The main area shows all documents saved by the workflow via `this.documentStore.save()`, in order. Each document is rendered using its YAML widget configuration:

- **Chat messages** (`LlmMessageDocument`) render as conversation bubbles with role labels
- **Markdown** renders as formatted text
- **Forms** render as editable fields, optionally with action buttons
- **Code** renders in a syntax-highlighted code viewer
- **Error documents** render with error styling

Documents update in real time as the workflow progresses.

### Interactive Widgets

When a workflow reaches a `wait: true` transition, the UI activates the corresponding widget. Depending on the YAML config:

- A **prompt-input** widget appears at the bottom — type a message and press Enter to send
- A **form with action buttons** becomes editable — fill in fields and click a button (e.g. Confirm, Reject) to trigger the transition
- The workflow resumes immediately after the trigger

Widgets are shown or hidden based on the current workflow place via `enabledWhen` in the YAML config.

### Toolbar

The top bar of the Workbench shows:

- **Workflow title and run number** (e.g. `Review Workflow — Run #4`)
- **Retry button** — visible when a transition has failed. Retries the failed transition immediately.
- **Run Log** — opens a dialog showing the complete transition history: each transition name, its source and target place, timestamp, and status. Sub-workflow transitions are included.
- **Graph** — opens a visual state machine diagram of the workflow, showing all places and transitions. Active and completed states are highlighted.

### Right Sidebar Panels

The icon strip on the far right toggles collapsible panels:

| Icon    | Panel           | Content                                                                                               |
| ------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| Play    | **Runs**        | Execution timeline for the current workspace — all runs in chronological order with status indicators |
| Monitor | **Preview**     | Embedded preview of a connected environment (available on cloud deployments)                          |
| Server  | **Environment** | Environment connection settings for remote deployments                                                |

---

## Workspaces

A **workspace** is a runtime instance of an app for a specific user or context. When a new workspace is created, it is linked to an app (defined by `@StudioApp`) and stores all workflow runs and documents for that context.

The workspace view (`/workspaces/:id`) shows workspace details and a link to its run history. The **Runs** panel within a workspace shows an execution timeline of all runs, sorted by time, with status badges (running, paused, completed, failed).

---

## Runs List

The `/runs` page shows all workflow runs across all workspaces. Columns include:

- Workflow name and run number
- Workspace name
- Status (running, paused, completed, failed)
- Start time and duration

Click any run to open it in the Workbench.

---

## Starting Studio

Studio is included in the full Docker Compose setup:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

### Alternatively: Run from Source

To run Studio from source, start the environment using the infrastructure-only compose file:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.infra.yml up -d
```

And run the loopstack studio from the loopstack monorepo:

```
git clone git@github.com:loopstack-ai/loopstack.git
cd loopstack/frontend/studio
npm install
npm run dev
```

---

## Next Steps

- [Getting Started](../build/getting-started.md) — set up your first project and see Studio in action
- [Studio Configuration](../build/fundamentals/studio-config.md) — per-app `ui` options on `@StudioApp`
- [Human-in-the-Loop](../build/patterns/human-in-the-loop.md) — build workflows that pause for user input in Studio
- [Documents](../build/fundamentals/documents.md) — control how your workflow output renders in Studio
