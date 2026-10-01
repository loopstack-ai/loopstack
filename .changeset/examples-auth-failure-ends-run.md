---
'@loopstack/github-examples': patch
'@loopstack/google-workspace-examples': patch
---

`github_overview_example` and `google_calendar_summary_example` end `failed` when sign-in fails.

- When the `oauth` sub-workflow fails or is canceled (for example because the provider's client ID is not
  configured), the run moves to `auth_failed` and reports the sub-workflow's error message.
- From `auth_failed`, the `retryAuth` transition starts over from `start`. A successful sign-in still retries
  from `start` straight away.
