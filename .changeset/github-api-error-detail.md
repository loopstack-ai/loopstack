---
'@loopstack/github': minor
---

A failed GitHub call reports what GitHub said. Every tool now builds its error with `githubApiError(response)`: the status number, GitHub's own message and validation errors, and the `x-github-request-id` — which is the only thing left when a 5xx arrives with an empty body. So a run shows `GitHub API error: 422 Unprocessable Entity — Validation Failed: name already_exists (request id C4E2:1A0F)` where it showed `GitHub API error: Unprocessable Entity`. The OAuth token exchange reports the same way, under its own prefix.
