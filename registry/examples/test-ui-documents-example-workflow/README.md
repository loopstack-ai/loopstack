# @loopstack/test-ui-documents-example-workflow

Demonstrates core Studio document rendering by emitting message, error, markdown, and plain-text documents from a single workflow.

## By using this example you'll get...

- A compact workflow for UI/document smoke testing
- Real examples of `MessageDocument`, `ErrorDocument`, `MarkdownDocument`, and `PlainDocument`
- A quick baseline for validating custom Studio document rendering behavior

## Installation

```sh
npm install @loopstack/test-ui-documents-example-workflow
```

## How It Works

1. `renderAll` saves one document of each core UI type.
2. The workflow transitions to `end` after writing all documents.
3. Studio displays each document using its corresponding renderer.

## Public API

- `TestUiDocumentsExampleModule`
- `TestUiDocumentsWorkflow`

## Dependencies

- `@loopstack/common`
