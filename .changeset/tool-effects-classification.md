---
'@loopstack/github-module': patch
'@loopstack/git-module': patch
'@loopstack/google-workspace-module': patch
'@loopstack/remote-client': patch
'@loopstack/secrets-module': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/hitl': patch
'@loopstack/web-module': patch
'@loopstack/code-agent': patch
'@loopstack/claude-tools-module': patch
'@loopstack/claude-module': patch
'@loopstack/agent': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/sandbox-tool': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/oauth-examples': patch
'@loopstack/observability-examples': patch
'@loopstack/agent-examples': patch
'@loopstack/testing-examples': patch
---

Every registry tool declares its effect classification via `@Tool({ effects })`: `'none'` for reads, searches, computations, and LLM generation; `'external'` for calls that write outside the run (GitHub/Google mutations, git repository writes, remote command execution and file writes, sandbox mutations, OAuth token exchange, MCP tool invocation).
