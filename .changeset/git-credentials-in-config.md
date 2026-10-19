---
'@loopstack/git': minor
'@loopstack/github-integration': patch
---

`git_push`, `git_pull` and `git_fetch` read their token themselves, through `GitTokenService`. The call names where it comes from in its config — `tokenEnv` for an environment variable of the machine, `tokenSecret` for a secret of the run's workspace, `oauthProvider` for the OAuth token of the person the run belongs to — and `GitModule.forRoot()` names the default for every call. The first source set wins, in that order; with none set the command runs unauthenticated, which is all a public remote needs.

The token is no longer an argument of those three tools. Arguments are the model-facing input of a tool and are kept in the run trace, so a token passed as one is written to the database; a source name is what the author knows at the call site and is safe to keep. The resolved token goes straight to the remote server, which applies it through a throwaway `GIT_ASKPASS`.

`ConnectGitHubWorkflow` names `oauthProvider: 'github'` on the calls that push and fetch, and no longer reads the token itself.
