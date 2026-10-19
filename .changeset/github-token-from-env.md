---
'@loopstack/github': minor
---

Every tool takes its token from `GitHubTokenService`, which looks in three places: the environment variable the call names through `config: { tokenEnv }`, the one the module names through `GitHubModule.forRoot({ tokenEnv })`, and otherwise the OAuth token of the person the run belongs to. A named variable that is not set means there is no token rather than a reason to look further.

An environment variable holds a token that belongs to the machine, which is what a headless app runs on, and naming one per call lets a single operation use a different credential from the rest of the app. An OAuth token says who is acting, which is what an app with people in front of it needs.

`github_create_repo` takes an `owner`: an organization, or the token's own account when it is left out or names that account. GitHub has one endpoint for each, so the tool asks who the token belongs to and picks. Its result carries `cloneUrl` beside the browser URL, which is what a caller pushing into the new repository needs next.

Every tool that gets one thing answers with `null` in place of it when there is none, or the token cannot see it: `github_get_repo`, `github_get_issue`, `github_get_pull_request`, `github_get_commit`, `github_get_file_content` and `github_get_workflow_run`. Asking whether a thing exists is a fair question, so a 404 is an answer rather than an error the caller would have to tell apart from a real one.
