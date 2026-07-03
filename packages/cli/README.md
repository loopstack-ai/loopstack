# @loopstack/cli

Run, trace, and watch [Loopstack](https://loopstack.ai) workflows from the terminal — live transition and LLM token streaming, human-in-the-loop prompts answered inline, and CI-ready JSON output with meaningful exit codes.

```bash
npm install -g @loopstack/cli
```

```bash
$ loopstack run hello --arg name=Maya

▸ run 088cd19c… started
▸ start
"Hey there, Maya! 👋 Ready to make some terminal magic happen today?"
✓ start (2.3s)
■ run completed in 2.4s
```

When a run asks a question, answer it right there:

```
⏸ waiting_for_answer

Which environment should we deploy to?
  1. staging
  2. production
answer: 2
■ run completed
```

## Commands

| Command                    | What it does                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `loopstack run <workflow>` | Start a run and follow it live; `--arg k=v`, `--arg k=@file.json`, `--no-follow`, `--json` |
| `loopstack trace <run-id>` | Audit trail of a run; `--follow` attaches live and answers prompts                         |
| `loopstack watch`          | Live event stream; `--workflow`, `--type`, NDJSON with `--json`                            |
| `loopstack list`           | Recent runs                                                                                |
| `loopstack login`          | Save a backend environment to `~/.loopstack/config.json`                                   |
| `loopstack env list\|use`  | Manage saved environments                                                                  |

## CI

```yaml
- run: npx --yes @loopstack/cli run triage-ticket --arg ticket=@samples/ticket-042.json --json
  env:
    LOOPSTACK_URL: ${{ vars.LOOPSTACK_URL }}
    LOOPSTACK_TOKEN: ${{ secrets.LOOPSTACK_TOKEN }}
```

Exit codes: `0` completed · `1` failed · `2` connection/config error · `3` waiting for input (non-interactive). `--json` prints one final object — `{ workflowId, status, result, errorMessage, durationMs }` — on a clean stdout.

Local backends with auth disabled need no login or token at all. Full documentation: [CLI Reference](https://loopstack.ai/docs/reference/cli).
