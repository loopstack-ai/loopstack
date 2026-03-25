---
'@loopstack/github-oauth-example': patch
'@loopstack/google-oauth-example': patch
---

Migrate OAuth examples to claude-module and add authentication task tools

- Replace ai-module with claude-module across GitHub and Google OAuth examples
- Add authenticate-github-task and authenticate-google-task tools for automatic OAuth handling
- Update agent workflows with explicit authentication instructions and error detection
- Refactor message format from parts array to Claude content structure
