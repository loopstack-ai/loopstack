---
'@loopstack/hitl': patch
'@loopstack/agent': patch
'@loopstack/github-module': patch
'@loopstack/git-module': patch
'@loopstack/google-workspace-module': patch
'@loopstack/remote-client': patch
'@loopstack/web-module': patch
'@loopstack/secrets-module': patch
'@loopstack/mcp-module': patch
'@loopstack/oauth-module': patch
'@loopstack/code-agent': patch
'@loopstack/claude-tools-module': patch
'@loopstack/sandbox-tool': patch
'@loopstack/sandbox-filesystem': patch
'@loopstack/advanced-workflows-examples': patch
'@loopstack/oauth-examples': patch
'@loopstack/observability-examples': patch
'@loopstack/agent-examples': patch
---

All tools declare `resultSchema` result contracts: every `@Tool` class ships a strict Zod schema describing its success result, exported alongside the result type. Results are validated by the tool pipeline; replayed test fixtures are held to the same contract as live results.
