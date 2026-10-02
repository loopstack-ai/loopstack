---
'@loopstack/github-module': patch
'@loopstack/oauth-module': patch
---

GitHub sign-in reports GitHub's own error, and the content and review tools handle more of what GitHub returns.

- A rejected GitHub token exchange (bad or expired code, wrong client secret, redirect URI mismatch) fails with
  GitHub's error description.
- `exchange_oauth_token` throws before storing anything when a provider returns no access token, so a failed
  sign-in keeps the user's existing token.
- `github_get_file_content`, `github_create_or_update_file` and `github_list_directory` URL-encode each path
  segment, so names containing `#`, `?` or `%` address the right file.
- `github_list_directory` returns `{ error: 'not_a_directory' }` when the path points to a file.
- `github_list_pr_reviews` accepts pending reviews; `submittedAt` is optional.
