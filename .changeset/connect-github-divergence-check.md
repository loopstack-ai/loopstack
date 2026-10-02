---
'@loopstack/github-integration': patch
---

`connect_github` compares the checked-out branch with the same branch on `origin` when linking an existing
repository.

- A workspace ahead of the remote is pushed directly. If the remote is ahead, or the histories differ, the user
  is asked how to resolve it.
- When the remote has no branch of that name, the branch is pushed and created there.
- A detached HEAD, unreadable comparison output, or a failing git command (auto-commit, reset, merge, remote
  removal) fails the run with the git error instead of reporting the repository as connected.
