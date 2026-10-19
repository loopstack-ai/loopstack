---
'@loopstack/remote-client': minor
'@loopstack/git': minor
---

A status says which column changed, and a commit can carry its own author.

`gitStatus` and `git_status` return `entries` beside the folded lists: git's own two columns per path, `index` for what is staged and `worktree` for what is not. The lists answer what changed; the columns are the only way to tell an index change from a working-tree one, which is what a caller that has just staged within a policy needs in order to ask what the policy left out.

`gitCommit` and `git_commit` take an `authorName` and `authorEmail`, which apply to that commit alone and leave the repository's own config as it is, and a `skipHooks` flag. Both halves of the identity are given together or not at all: git would otherwise take the other from the machine, and a commit half-attributed to whoever set up the container is worse than a refused request.

The git response types of `RemoteClient` — `GitStatusResponse`, `GitStatusEntry`, `GitCommandResult` and the rest — are exported and documented, since they are what its git methods return.

An agent image must be rebuilt for this: `entries` comes from the server.
