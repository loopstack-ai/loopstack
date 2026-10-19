---
'@loopstack/remote-client': minor
'@loopstack/code-workspace': minor
'@loopstack/git': minor
---

Every git call names the repository it works on. `RemoteClient`'s git methods take one options object with an optional `dir`, a path relative to the workspace root, and `gitClone` joins them. The git tools take `dir` as an argument and pass their args straight through, and the workspace git endpoints take it as a query parameter.

A workspace can hold several repositories in one tree — a monorepo beside the app that consumes it, or one checkout per base — so the directory is part of the request rather than a property of the connection. Omitting it addresses the workspace root, which is what a workspace holding a single repository wants.

Each git route names how long its command may take. A command that only reads or writes refs, config or the index header gets 30 seconds, because it is quick or it is stuck. A command that walks the working tree or talks to a remote gets ten minutes: a workspace is a bind mount from the host, where `status`, `add`, `commit`, `diff` and `checkout` over a monorepo take minutes, and a clone or a push takes as long as the repository and the network need.

`@loopstack/remote-server` validates the path instead of trusting it: it must stay inside the workspace root, which rules out absolute paths and `..` traversal. `/git/clone` creates the target directory and clones into it, applying a token through a throwaway `GIT_ASKPASS` so it never reaches the URL, the argv or `.git/config`.
