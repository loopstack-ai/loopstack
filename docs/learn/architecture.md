---
title: Architecture Overview
description: How the components of a Loopstack deployment fit together — NestJS backend, BullMQ workers, PostgreSQL, Redis, Studio frontend, and their communication patterns.
---

# Architecture Overview

This page explains how the components of a Loopstack deployment fit together — what runs where, what each component owns, and how they communicate.

---

## Components

```
┌──────────────────────────────────────────────────────────────────┐
│  Your NestJS App  (localhost:3000)                               │
│                                                                  │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Workflow Engine │  │  REST API      │  │  BullMQ Worker   │  │
│  │  (state machine) │  │  (@loopstack/  │  │  (transition     │  │
│  │                 │  │   api)         │  │   execution)     │  │
│  └────────┬────────┘  └───────┬────────┘  └────────┬─────────┘  │
│           │                  │                     │            │
└───────────┼──────────────────┼─────────────────────┼────────────┘
            │                  │                     │
    ┌───────▼──────┐   ┌───────▼──────┐     ┌───────▼──────┐
    │  PostgreSQL  │   │   Studio     │     │    Redis     │
    │  (state,     │   │  (localhost: │     │  (BullMQ     │
    │   documents) │   │   5173)      │     │   queues)    │
    └──────────────┘   └──────────────┘     └──────────────┘
```

| Component            | What it does                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **NestJS App**       | Your backend — runs the workflow engine, exposes the REST API, executes transitions via a BullMQ worker |
| **PostgreSQL**       | Durable storage for workflow state, checkpoints, and documents                                          |
| **Redis**            | BullMQ job queues for transition execution; real-time event routing to Studio                           |
| **Loopstack Studio** | Web UI for starting runs, interacting with paused workflows, and monitoring execution                   |

---

## What Lives Where

### PostgreSQL

PostgreSQL is the source of truth for all persistent workflow data:

- **Workflow runs** — each run has an ID, status (running/waiting/completed/failed), current place, and any error state
- **Checkpoints** — after every transition, a snapshot of the current state is written. Each checkpoint records the place, state object, and document IDs at that point in time
- **Documents** — every call to `this.documentStore.save()` writes a document row linked to the workflow run

If your process restarts mid-run, the workflow resumes exactly from the last checkpoint.

### Redis

Redis powers BullMQ, the job queue Loopstack uses to execute transitions:

- Each transition execution is a **BullMQ job** — durable, retried on failure, with configurable backoff
- Workflow runs are queued as jobs and processed by a BullMQ worker inside your NestJS app
- Redis also carries real-time events from the backend to Studio so the document feed updates live

Redis does not store any workflow state. If Redis goes down, queued-but-not-yet-started jobs may be lost, but all completed state lives safely in PostgreSQL.

### Studio

Studio is a static web app that talks to your NestJS backend over HTTP. It reads workflow runs, documents, and status from the REST API, and sends user actions (button clicks, form submissions) back as transition triggers.

Studio connects to whichever backend URL is configured in `VITE_API_URL` (defaults to `http://localhost:3000`).

---

## How a Workflow Run Flows Through the System

Here's what happens when you click **Run Now** in Studio:

```
1. Studio  →  POST /api/workflows/:id/run
2. API        Creates a WorkflowEntity in PostgreSQL (status: pending)
3. API        Enqueues a BullMQ job with the run ID
4. Worker     Picks up the job, loads the workflow class
5. Engine     Loads state from latest checkpoint (empty on first run)
6. Engine     Runs auto-transitions in a loop until wait or end
7. Engine     After each transition: saves checkpoint + state in a DB transaction
8. Engine     If wait: true is reached → saves status: waiting → job ends
9. Studio     Polls / receives real-time update → shows document feed
```

When a user triggers a `wait: true` transition (clicks a button, submits a form):

```
10. Studio  →  POST /api/workflows/:id/transition
11. API         Enqueues a new BullMQ job with the transition payload
12. Worker      Picks up job, loads state from latest checkpoint
13. Engine      Executes the wait transition with the user payload
14. Engine      Continues auto-transitions until next wait or end
```

The key insight: **each "run" of the BullMQ job is a single processing pass**. The job runs all the auto-transitions it can in sequence, then stops when it hits a `wait: true` or `end`. The workflow's place and state are persisted to PostgreSQL between passes, so the job can stop and resume safely.

---

## Starting the Infrastructure

The `@loopstack/loopstack-module` package ships two Docker Compose files:

**Full stack** (includes Studio):

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

**Infrastructure only** (PostgreSQL + Redis, run Studio from source):

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.infra.yml up -d
```

The full-stack file starts:

- PostgreSQL 16 on port `5432`
- Redis 8 on port `6379` (with AOF persistence)
- Loopstack Studio on port `5173`, pointing to your backend at `http://localhost:3000`

To change the backend URL Studio connects to, set `VITE_API_URL` in your `.env` file:

```dotenv
VITE_API_URL=http://my-backend.example.com
```

---

## Next Steps

- [How the Workflow Engine Works](/docs/learn/workflow-engine) — state persistence, transactions, retries
- [Why Documents Exist](/docs/learn/document-store) — the role of the document store and its relationship to state
- [Configuration](/docs/reference/configuration) — all environment variables and `LoopstackModule.forRoot()` options
