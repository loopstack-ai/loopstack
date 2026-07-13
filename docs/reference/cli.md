---
title: CLI Reference
description: The loopstack CLI — scaffold a new app with loopstack create, run workflows from the terminal with live transition, LLM token, and tool call streaming, answer human-in-the-loop prompts inline (text, confirm, choices, forms with $EDITOR, chat inputs, secret entry), reattach to running or waiting runs with loopstack attach, retry failed runs interactively, inspect and watch runs, manage backend environments and API tokens. Covers loopstack create, list, run, runs, attach, watch, login, env, the --json/--quiet output modes, exit codes for CI, stdin args (@-), --open, and LOOPSTACK_URL/LOOPSTACK_TOKEN/LOOPSTACK_STUDIO_URL configuration.
---

# CLI Reference

The `loopstack` CLI covers the whole loop: scaffold an app, run a workflow, watch its transitions and LLM tokens stream live, answer human-in-the-loop prompts inline, and wire the same command into CI with JSON output and meaningful exit codes. It talks plain HTTP to your backend through `@loopstack/client` — the same API Studio uses.

```bash
npm install -g @loopstack/cli
```

## Creating a new app

```bash
loopstack create my-app
cd my-app
docker compose up -d      # Postgres, Redis, and Studio
npm run start:dev         # backend on http://localhost:3000
```

`create` scaffolds a fresh NestJS app via the official Nest CLI, wires in `LoopstackModule.forRoot()`, and adds a zero-config hello workflow — no API keys needed for the first run. The scaffold includes a docker-compose file for Postgres, Redis, and Studio (on [http://localhost:5173](http://localhost:5173)), a ready-to-edit `.env`, and an initialized git repository.

```bash
loopstack run hello --arg name=You    # your first run, from the terminal
```

- `--skip-install` — scaffold only; dependencies stay listed in `package.json`
- `--no-git` — skip `git init`

## Connecting to a backend

Every command resolves its backend in this order:

1. `--url <url>` / `--env <name>` / `--token <token>` flags
2. `LOOPSTACK_URL` and `LOOPSTACK_TOKEN` environment variables (the CI path)
3. The default environment in `~/.loopstack/config.json`
4. `http://localhost:3000` with no credentials — local dev needs no login at all

```bash
loopstack login                 # interactive: URL, optional lsk_ token, name
loopstack env list              # saved environments
loopstack env use staging       # switch the default
```

`loopstack login` probes the backend before saving, so bad URLs or tokens fail immediately. The config file is written user-only (`0600`). API tokens for real deployments are created via `POST /api/v1/auth/tokens` (or Studio) and start with `lsk_`.

### Studio deep links

An environment can carry the URL of its Studio frontend — `loopstack login` asks for it (`--studio-url` non-interactively), `LOOPSTACK_STUDIO_URL` overrides it, and the zero-config local fallback assumes `http://localhost:5173`. When the CLI knows where Studio lives, its output links there: a detached run prints its Studio URL, a run waiting for input shows where to answer it in the browser, failures link to the run for inspection, and `loopstack runs --json` carries a `studioUrl` per run. `--open` (on `run` and `runs <run-id>`) opens the run in the browser directly.

## Running workflows

```bash
loopstack run hello --arg name=Maya
```

`run` starts the workflow, subscribes to the event stream _before_ starting (no event is missed), and renders the run live: one step line per place with its duration, LLM tokens and tool calls streamed inline, documents the run saves (from the run and its sub-workflows, behind a `│ ` rail per nesting level; children launched with `show: 'hidden'` stay hidden like in Studio), the published result, and a final status line. Rendering follows the same widget configs Studio uses — messages, markdown, forms (with Studio's field order and labels), links, errors; unknown widgets fall back to JSON.

- `--arg key=value` — repeatable; values that parse as JSON are coerced (`count=3` → number, `flags={"a":1}` → object), everything else stays a string
- `--arg ticket=@samples/ticket-042.json` — read the value from a file (parsed as JSON when it is JSON)
- `--arg notes=@-` — read the value from stdin: `cat notes.txt | loopstack run summarize --arg notes=@-`
- `--workspace <id>` — pin the workspace; by default the newest workspace of the workflow's app is used (created on demand)
- `--detach` — start the run, print its id, exit immediately
- `--quiet` — no progress, print only the final result (pipe-friendly)
- `--open` — open the run in Studio

Not sure what you can run? `loopstack list` shows every workflow of the environment with its app and title — and `loopstack list <workflow>` shows one workflow's arguments (name, type, required, default, from its zod schema) plus a copy-pasteable `run` example. `--json` returns the raw schema for tooling.

### Human-in-the-loop prompts

When a followed run parks in `waiting`, the CLI finds the active prompt — including prompts on sub-workflows — and renders it right in the terminal:

```
⏸ waiting_for_answer

What is your name?
> Maya
✓ waiting_for_answer
■ run completed in 920ms
```

Free-text questions, yes/no confirmations, option choices, approval buttons, chat inputs (workflows with a `prompt-input` widget loop right in the terminal), and secret entry (`secret-input` — values collected without echo, stored via the secrets API, never shown or logged) are all answered inline. The terminal prompt and Studio race fairly: while a prompt is open the CLI stays attached to the event stream, so an answer given in Studio (or by anyone else) is picked up immediately and following continues.

Forms are picker-first: the form's content renders, its actions are offered as a numbered picker (an action submits the current content, exactly like Studio's buttons), and `e` optionally opens the complete content JSON in `$EDITOR` first. Fields marked `readonly: true` in the widget config are protected — the CLI discards edits to them (`field "subject" is read-only — change discarded`), and the backend rejects them regardless of client.

Input the terminal cannot collect is named instead of guessed: a widget without a CLI implementation prints what it is waiting for plus the Studio deep link, and waits that resolve in the browser — an OAuth sign-in link, for example — resume the attached session automatically once completed. Failed runs offer an interactive retry (`r. retry` re-runs the failed step, Studio's Retry equivalent), and a workflow parked at a custom error place surfaces its recovery button in the same prompt.

In non-interactive shells (CI), the question is printed to stderr and the command exits with code `3`.

### JSON mode and exit codes

```bash
loopstack run hello --arg name=CI --json | jq .status
```

`--json` keeps stdout machine-readable: progress renders on stderr, and the final line of stdout is one JSON object — `{ workflowId, status, result, errorMessage, durationMs }`. `result` is the run's published result (built with `assignResult`/`setResult`).

| Exit code | Meaning                                                                                |
| --------- | -------------------------------------------------------------------------------------- |
| `0`       | run completed                                                                          |
| `1`       | run failed or was canceled                                                             |
| `2`       | connection or configuration problem (unreachable backend, bad token, unknown workflow) |
| `3`       | run is waiting for input in a non-interactive shell                                    |

A CI quality gate is the same command, unchanged:

```yaml
# .github/workflows/ci.yml
- run: npx --yes @loopstack/cli run triage-ticket --arg ticket=@samples/ticket-042.json --json
  env:
    LOOPSTACK_URL: ${{ vars.LOOPSTACK_URL }}
    LOOPSTACK_TOKEN: ${{ secrets.LOOPSTACK_TOKEN }}
```

## Inspecting runs

```bash
loopstack runs                          # recent runs — waiting-for-input first
loopstack runs --limit 5 --json
loopstack runs --search invoice --status waiting
loopstack runs <run-id>                 # full transcript: steps, documents, result
loopstack attach <run-id>               # rejoin live — streams and answers prompts
loopstack watch                         # the environment's event firehose
loopstack watch --type workflow.updated --json   # NDJSON, filterable
```

`loopstack runs` is the inbox: runs paused on human input are surfaced at the top of the listing, and `--search`/`--status`/`--workspace` narrow it down. With a run id, it prints the run's full transcript — step lines with durations, the run tree's documents in chronological order, and the published result.

`loopstack attach` rejoins a run the way `docker attach` joins a container: the transcript so far, then live output and interactive prompts — including runs that are already waiting for input when you attach (started from Studio, cron, or another shell). `watch` streams every event of the environment as it happens; with `--json` each event is one NDJSON line.

## Output conventions

Data goes to stdout; progress, prompts, and errors go to stderr — `--json` output is always pipe-safe. Colors follow the [`NO_COLOR`](https://no-color.org) convention and are disabled automatically when stdout is not a terminal.
