---
'@loopstack/secrets-example-workflow': minor
'@loopstack/test-ui-documents-example-workflow': minor
'@loopstack/accessing-tool-results-example-workflow': patch
'@loopstack/chat-example-workflow': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/prompt-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/run-sub-workflow-example': patch
'@loopstack/sandbox-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
'@loopstack/app-template': patch
---

Add secrets and test-ui-documents examples, migrate all examples from core-ui-module to core

- New secrets-example-workflow demonstrating secret request and verification flow
- New test-ui-documents-example-workflow (moved from deleted core-ui-module)
- Update all existing examples to use @loopstack/core instead of @loopstack/core-ui-module
- Remove @loopstack/core-ui-module dependency from app-template
