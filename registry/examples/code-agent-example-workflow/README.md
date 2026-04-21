# @loopstack/code-agent-explore-example-workflow

Demonstrates how to launch the `ExploreAgentWorkflow` from [`@loopstack/code-agent`](../../features/code-agent-module) as a sub-workflow to explore a remote workspace and surface a synthesized summary.

## By using this example you'll get...

- A parent workflow that runs `ExploreAgentWorkflow` with a fixed exploration brief
- A `LinkDocument` that renders the embedded sub-workflow while it runs
- A final `MessageDocument` summarizing the agent's findings

## Installation

```sh
loopstack add @loopstack/code-agent-explore-example-workflow
```

`@loopstack/code-agent` transitively requires `@loopstack/claude-module` and `@loopstack/remote-client` — make sure both are configured (Anthropic API key + sandbox environment) before running.

## How It Works

1. The workflow starts and calls `ExploreAgentWorkflow.run({ instructions })`.
2. The sub-agent iterates over `glob`, `grep`, and `read` tool calls against the remote workspace until it reaches a final answer.
3. The callback fires with the agent's synthesized response.
4. A `MessageDocument` is saved with the response text.

## Public API

- `CodeAgentExploreExampleModule`
- `CodeAgentExploreExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/code-agent`
