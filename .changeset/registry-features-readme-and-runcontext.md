---
'@loopstack/agent': patch
'@loopstack/claude-module': patch
'@loopstack/claude-tools-module': patch
'@loopstack/code-agent': patch
'@loopstack/git-module': patch
'@loopstack/github-module': patch
'@loopstack/github-integration': patch
'@loopstack/google-workspace-module': patch
'@loopstack/hitl': patch
'@loopstack/llm-provider-module': patch
'@loopstack/local-file-explorer-module': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/openai-module': patch
'@loopstack/quota': patch
'@loopstack/remote-client': patch
'@loopstack/remote-file-explorer-module': patch
'@loopstack/secrets-module': patch
'@loopstack/web-module': patch
'@loopstack/sandbox-tool': patch
'@loopstack/sandbox-filesystem': patch
---

Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.