# @loopstack/cli

Scaffold, run, inspect, and watch [Loopstack](https://loopstack.ai) workflows from the terminal — live transition and LLM token streaming, human-in-the-loop prompts answered inline, and CI-ready JSON output with meaningful exit codes.

```bash
npm install -g @loopstack/cli
```

Start a new app with a zero-config hello workflow:

```bash
loopstack create my-app
cd my-app && docker compose up -d && npm run start:dev
```

```bash
$ loopstack run hello --arg name=Maya

▸ run 088cd19c… started
▸ start
✓ start (9ms)
Hello, Maya! 👋
result: {"greeting":"Hello, Maya! 👋"}
■ run completed in 96ms
```

When a run asks a question, answer it right there — or in Studio; whichever answers first wins, and the CLI keeps following either way. Choices, confirms, chat inputs, and secret entry render as native prompts; forms submit as-is or open the complete content in `$EDITOR` first:

```
⏸ waiting_for_answer

Which environment should we deploy to?
  1. staging
  2. production
answer: 2
■ run completed
```

Input only Studio can collect is named explicitly (with a deep link) instead of hanging, and browser-based waits — like an OAuth sign-in link — resume the attached session automatically once completed.

## Commands

| Command                     | What it does                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `loopstack create <dir>`    | Scaffold a new Loopstack app (NestJS + LoopstackModule + hello workflow + docker-compose)                                          |
| `loopstack list [workflow]` | Workflows you can run; with a name: its arguments and a ready-to-run example                                                       |
| `loopstack run <workflow>`  | Start a run and follow it live; `--arg k=v`, `--arg k=@file.json`, `--arg k=@-` (stdin), `--detach`, `--quiet`, `--open`, `--json` |
| `loopstack runs [run-id]`   | Recent runs (waiting-for-input first) or one run’s full transcript                                                                 |
| `loopstack attach <run-id>` | Rejoin a run live — transcript so far, then streaming output and interactive prompts (docker/tmux semantics)                       |
| `loopstack watch`           | Live event stream; `--workflow`, `--type`, NDJSON with `--json`                                                                    |
| `loopstack login`           | Save a backend environment to `~/.loopstack/config.json`                                                                           |
| `loopstack env list\|use`   | Manage saved environments                                                                                                          |

## CI

```yaml
- run: npx --yes @loopstack/cli run triage-ticket --arg ticket=@samples/ticket-042.json --json
  env:
    LOOPSTACK_URL: ${{ vars.LOOPSTACK_URL }}
    LOOPSTACK_TOKEN: ${{ secrets.LOOPSTACK_TOKEN }}
```

Exit codes: `0` completed · `1` failed · `2` connection/config error · `3` waiting for input (non-interactive). `--json` prints one final object — `{ workflowId, status, result, errorMessage, durationMs }` — on a clean stdout.

Local backends with auth disabled need no login or token at all. When an environment has a Studio URL (saved via `login`, `LOOPSTACK_STUDIO_URL`, or the local default), run output includes deep links into Studio — and `--open` jumps straight there. Full documentation: [CLI Reference](https://loopstack.ai/docs/reference/cli).
