---
'@loopstack/git': minor
'@loopstack/remote-client': minor
'@loopstack/github-integration': minor
---

A workspace says which repositories it holds, so a reader can pick one.

`@loopstack/git` asks through `GIT_REPOSITORY_SOURCE`: the application that created the checkout implements `GitRepositorySource.list(workspaceId)` and `GET .../git/repos` answers `{ repos: [{ key, dir, url?, branch?, primary? }] }`. Git itself cannot answer this — a tree walk finds every `.git` directory, including those of dependencies and fixtures, and cannot say which is the primary one — and the application already knows. Nothing has to provide it: without a source the endpoint answers an empty list, which reads as "one repository, at the root", and it needs no running container because the list is what the workspace was created with.

`ConnectGitHubWorkflow` takes a `dir` and connects that repository: its remote, its identity, its divergence check and its push. Each repository has its own remote, so connecting one is not connecting the workspace.

`bash` takes a `cwd`, relative to the workspace root. The exec route always accepted one; the tool simply never passed it on, which left a command that has to run in a particular repository with no way to say so.
