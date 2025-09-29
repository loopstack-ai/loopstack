---
docPath: /docs/tools/create-mock
sourceFiles: 
  - my-module/tools/create-mock-tool.ts
---

# CreateMock Tool

## Description
The CreateMock tool is a debugging and testing utility that allows you to simulate tool responses without executing actual logic. It's particularly useful for testing workflows, validating data transformations, and debugging complex execution flows.

## Usage
```yaml
call:
  - tool: CreateMock
    arguments:
      input: my debug input
      output: my mock output
```

```yaml
call:
  - tool: CreateMock
    arguments:
      error: my error test
```

## Parameters

### `input` (optional)
- **Type:** `any`
- **Description:** Mock input data that will be logged for debugging purposes. Supports template expressions for dynamic values.
- **Example:**
  ```yaml
  call:
    - tool: CreateMock
      arguments:
        input:
          userId: "{{ parameters.userId }}",
          action: test
  ```

### `output` (optional)
- **Type:** `any`
- **Description:** The mock data to return as the tool's result. If not specified, returns `null`. Supports template expressions.
- **Example:**
  ```yaml
  call:
    - tool: CreateMock
      arguments:
        output:
          status: success,
  ```

### `error` (optional)
- **Type:** `string`
- **Description:** If provided, the tool will throw an error with this message instead of returning output. Useful for testing error handling. Supports template expressions.
- **Example:**
  ```yaml
  call:
    - tool: CreateMock
      arguments:
        error: "Failed to process user {{ parameters.userId }}"
  ```

### Template Expression Support
All parameters support template expressions, allowing you to reference:
- `{{parameters.*}}` - Parent workflow parameters
- `{{context.*}}` - Execution context data
- `{{workflow.*}}` - Workflow-specific data
- `{{transition.*}}` - Transition data

## Behavior

1. **Input Processing:** If `input` is provided, it's evaluated and logged for debugging
2. **Output Generation:** If `output` is provided, it's evaluated and returned as the tool's result
3. **Error Simulation:** If `error` is provided, an error is thrown with the evaluated message, ignoring any output
4. **Priority:** Error takes precedence - if `error` is specified, the tool will always throw an error regardless of other parameters

## Files:
- `my-module/tools/create-mock-tool.ts`

## Links
- [Tool Example](/docs)
