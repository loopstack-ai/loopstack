---
'@loopstack/git': minor
---

`git_squash`, `git_rebase` and `git_checkout_state` take the agent to run on in their config: `{ config: { agentUrl } }`.

A tool resolves its agent from the workspace's environments, which is right when the workspace is the container. A workflow that provisions a container for one piece of work — a landing, a publish — holds that container's URL in its own state, and no environment row points at it, so resolving the environment finds nothing. Naming the target is how such a workflow uses these tools. It is config rather than an argument because the author knows the container and a model must not be the one to choose it.
