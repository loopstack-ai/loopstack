---
'@loopstack/github': minor
---

`github_create_issue` takes the organization's issue `type` by name, like `github_update_issue` does. A type the organization does not define is rejected with a 422, which comes back as an error envelope, so a caller that wants the issue either way creates it without the type.
