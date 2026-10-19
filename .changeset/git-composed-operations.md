---
'@loopstack/git': minor
---

Three tools for the git work that takes several commands: `git_squash` replaces everything a branch added since a base ref with one commit, `git_rebase` rebases onto a ref, and `git_checkout_state` reports whether a checkout is fit to act on.

They exist because the outcome is what a caller can act on, and a single command does not carry it. `git_rebase` tells three outcomes apart: it finished, it stopped on conflicting files — which it names, leaving the rebase in progress so an agent or a person can finish it in the same checkout — or it failed for another reason, which it aborts and reports with git's own output. `git_checkout_state` answers what `git_status` does not: is a rebase still open, did anything keep its conflict markers, is the work built on the base and how far beyond it.

Each of them runs its commands with a ten-minute budget rather than the exec route's default of 30 seconds, because a tree walk over a monorepo on a bind-mounted checkout takes minutes. A ref that comes from the caller is checked before it goes into a command.
