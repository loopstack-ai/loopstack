---
title: Code Agent Example
description: Example launching ExploreAgentWorkflow as a sub-workflow to explore a remote workspace and surface a synthesized summary
---

# @loopstack/code-agent-example-workflow

Demonstrates how to launch the `ExploreAgentWorkflow` from [`@loopstack/code-agent`](https://loopstack.ai/docs/registry/features/code-agent-module) as a sub-workflow to explore a remote workspace and surface a synthesized summary.

## By using this example you'll get...

- A parent workflow that runs `ExploreAgentWorkflow` with a fixed exploration brief
- The embedded sub-workflow rendered inline in the parent's view via `show: 'inline'`
- A final `MessageDocument` summarizing the agent's findings

## Installation

```sh
npm install @loopstack/code-agent-example-workflow
```

`@loopstack/code-agent` transitively requires `@loopstack/claude-module` and `@loopstack/remote-client` — make sure both are configured (Anthropic API key + sandbox environment) before running.

Then register the module in your app:

```typescript
import { CodeAgentExampleModule, CodeAgentExampleWorkflow } from '@loopstack/code-agent-example-workflow';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Code Agent Example',
  workflows: [CodeAgentExampleWorkflow],
})
@Module({
  imports: [CodeAgentExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. The workflow starts and calls `ExploreAgentWorkflow.run({ instructions })`.
2. The sub-agent iterates over `glob`, `grep`, and `read` tool calls against the remote workspace until it reaches a final answer.
3. The callback fires with the agent's synthesized response.
4. A `MessageDocument` is saved with the response text.

## Public API

- `CodeAgentExampleModule`
- `CodeAgentExampleWorkflow`

## Dependencies

- `@loopstack/common`
- `@loopstack/code-agent`
