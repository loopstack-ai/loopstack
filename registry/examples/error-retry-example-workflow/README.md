---
title: Error Retry Example
description: Example demonstrating Loopstack retry and recovery — auto-retry, manual retry, custom error places, timeout handling, retry.place, hybrid retry patterns
---

# @loopstack/error-retry-example-workflow

Demonstrates Loopstack retry and recovery behaviors across auto-retry, manual retry, custom error places, timeout handling, and hybrid retry patterns.

## By using this example you'll get...

- A guided workflow that walks through five error/retry modes
- Practical examples of `retry`, `retry.place`, and `timeout` transition options
- Recovery transitions from error places back into the happy path

## Installation

```sh
npm install @loopstack/error-retry-example-workflow
```

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { ErrorRetryExampleModule, ErrorRetryWorkflow } from '@loopstack/error-retry-example-workflow';

@StudioApp({
  title: 'Error Retry Example',
  workflows: [ErrorRetryWorkflow],
})
@Module({
  imports: [ErrorRetryExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. **Auto-retry**: transition retries twice and succeeds on a later attempt.
2. **Manual retry**: a failed transition is retried by the user from Studio.
3. **Custom error place**: failures route to `error_custom` for explicit recovery.
4. **Timeout**: long-running tool call is cut off, then succeeds on retry.
5. **Hybrid mode**: limited auto-retries then fallback to `error_hybrid`.

Each step saves instructional `MessageDocument` entries so behavior is visible in the UI while running.

## Public API

- `ErrorRetryExampleModule`
- `ErrorRetryWorkflow`

## Dependencies

- `@loopstack/common`
