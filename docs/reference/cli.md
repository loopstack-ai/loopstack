---
title: CLI Reference
description: The loopstack CLI — run workflows from the terminal with live transition and LLM token streaming, answer human-in-the-loop prompts inline, trace and watch runs, manage backend environments and API tokens. Covers loopstack run, trace, watch, list, login, env, the --json output mode, exit codes for CI, and LOOPSTACK_URL/LOOPSTACK_TOKEN configuration.
---

# CLI Reference

The `loopstack` CLI keeps the edit-verify loop in the terminal: run a workflow, watch its transitions and LLM tokens stream live, answer human-in-the-loop prompts inline, and wire the same command into CI with JSON output and meaningful exit codes. It talks plain HTTP to your backend through `@loopstack/client` — the same API Studio uses.

```bash
npm install -g @loopstack/cli
```

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

## Running workflows

```bash
loopstack run hello --arg name=Maya
```

`run` starts the workflow, subscribes to the event stream _before_ starting (no event is missed), and renders the run live: one step line per place with its duration, LLM tokens streamed inline, and a final status line.

- `--arg key=value` — repeatable; values that parse as JSON are coerced (`count=3` → number, `flags={"a":1}` → object), everything else stays a string
- `--arg ticket=@samples/ticket-042.json` — read the value from a file (parsed as JSON when it is JSON)
- `--workspace <id>` — pin the workspace; by default the newest workspace of the workflow's app is used (created on demand)
- `--no-follow` — start the run, print its id, exit immediately

### Human-in-the-loop prompts

When a followed run parks in `waiting`, the CLI finds the active prompt — including prompts on sub-workflows — and renders it right in the terminal:

```
⏸ waiting_for_answer

What is your name?
> Maya
✓ waiting_for_answer
■ run completed in 920ms
```

Free-text questions, yes/no confirmations, option choices, and approval buttons are all supported. In non-interactive shells (CI), the question is printed to stderr and the command exits with code `3`.

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
loopstack list                          # recent runs, newest first
loopstack list --limit 5 --json
loopstack trace <run-id>                # audit trail: steps, durations
loopstack trace <run-id> --follow       # attach live — answers prompts too
loopstack watch                         # the environment's event firehose
loopstack watch --type workflow.updated --json   # NDJSON, filterable
```

`trace` reconstructs a run from its checkpoints — one line per place with the time spent there — and `--follow` attaches to the live stream, including runs that are already waiting for input when you attach (started from Studio, cron, or another shell). `watch` streams every event of the environment as it happens; with `--json` each event is one NDJSON line.

## Output conventions

Data goes to stdout; progress, prompts, and errors go to stderr — `--json` output is always pipe-safe. Colors follow the [`NO_COLOR`](https://no-color.org) convention and are disabled automatically when stdout is not a terminal.
