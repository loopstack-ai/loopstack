---
'@loopstack/common': patch
'@loopstack/agent': patch
'@loopstack/hitl': patch
'@loopstack/llm-provider-module': patch
'@loopstack/oauth-module': patch
'@loopstack/secrets-module': patch
'@loopstack/remote-client': patch
'@loopstack/accessing-tool-results-example-workflow': patch
'@loopstack/agent-example-workflow': patch
'@loopstack/chat-example-workflow': patch
'@loopstack/custom-tool-example-module': patch
'@loopstack/delegate-error-example-workflow': patch
'@loopstack/dynamic-routing-example-workflow': patch
'@loopstack/error-retry-example-workflow': patch
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
'@loopstack/hitl-example-module': patch
'@loopstack/llm-multi-provider-example-workflow': patch
'@loopstack/meeting-notes-example-workflow': patch
'@loopstack/prompt-example-workflow': patch
'@loopstack/prompt-structured-output-example-workflow': patch
'@loopstack/run-sub-workflow-example': patch
'@loopstack/secrets-example-workflow': patch
'@loopstack/tool-call-example-workflow': patch
---

Relative `widget:` paths on `@Workflow` / `@Tool` / `@Document` resolve against the class's source directory at decorator-evaluation time (e.g. `widget: './chat.ui.yaml'`). The `Block()` decorator captures the caller file via a new `getCallerFile()` helper and stores the directory under `BLOCK_DIR_METADATA_KEY`. `BaseTool` exposes the `render` Handlebars renderer alongside `BaseWorkflow`. Example workflow render call sites use `path.join(__dirname, 'templates', 'foo.md')`. Registry READMEs and docs swept; `uiConfig:` references in registry READMEs corrected to `widget:`. Resolves todo.md #9.
