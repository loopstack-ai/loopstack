---
'@loopstack/agent': patch
'@loopstack/common': patch
'@loopstack/hitl': patch
'@loopstack/llm-provider-module': patch
'@loopstack/oauth-module': patch
'@loopstack/remote-client': patch
'@loopstack/secrets-module': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/agent-examples': patch
'@loopstack/hitl-examples': patch
'@loopstack/llm-examples': patch
'@loopstack/oauth-examples': patch
'@loopstack/secrets-examples': patch
---

Relative `widget:` paths on `@Workflow` / `@Tool` / `@Document` resolve against the class's source directory at decorator-evaluation time (e.g. `widget: './chat.ui.yaml'`). The `Block()` decorator captures the caller file via a new `getCallerFile()` helper and stores the directory under `BLOCK_DIR_METADATA_KEY`. `BaseTool` exposes the `render` Handlebars renderer alongside `BaseWorkflow`. Example workflow render call sites use `path.join(__dirname, 'templates', 'foo.md')`. Registry READMEs and docs swept; `uiConfig:` references in registry READMEs corrected to `widget:`. Resolves todo.md #9.
