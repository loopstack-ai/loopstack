# @loopstack/delegate-error-example-workflow

Demonstrates how delegate tool-call loops handle different tool failure modes and feed structured error results back to the LLM for recovery.

## By using this example you'll get...

- A multi-turn LLM workflow using `LlmGenerateTextTool` + `LlmDelegateToolCallsTool`
- Three failure types in one flow: schema validation error, runtime error, and failing sub-workflow
- Error propagation back into the conversation via `LlmUpdateToolResultTool`

## Installation

```sh
npm install @loopstack/delegate-error-example-workflow
```

This example uses `@loopstack/claude-module` through `@loopstack/llm-provider-module`, so configure Claude credentials before running.

## How It Works

1. The workflow seeds an instruction asking the model to intentionally trigger tool failures first.
2. The LLM generates tool calls (`strict_schema`, `runtime_error`, `failing_sub_workflow`).
3. Delegate execution runs tools and callback updates merge results into pending delegate state.
4. Completed tool results are posted back as `tool_result` blocks so the LLM can self-correct.
5. The workflow ends when the model reaches `end_turn` and stores the final message.

## Public API

- `DelegateErrorExampleModule`
- `DelegateErrorWorkflow`

## Dependencies

- `@loopstack/common`
- `@loopstack/llm-provider-module`
- `@loopstack/claude-module`
