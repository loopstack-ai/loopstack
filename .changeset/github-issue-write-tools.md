---
'@loopstack/github': minor
---

Eleven tools cover the rest of the issue surface: `github_add_issue_labels`, `github_remove_issue_label`, `github_ensure_label`, `github_update_issue`, `github_close_issue`, `github_add_issue_assignees`, `github_remove_issue_assignees`, `github_list_issue_comments`, `github_set_issue_fields`, `github_add_issue_dependency` and `github_delete_branch`. `github_close_issue` takes `notPlanned` or `duplicateOf` and resolves the canonical issue's id itself. `github_set_issue_fields` looks the organization's issue fields up by name through the repository, so a fine-grained token still sees them, and fails naming the field or the option the repository does not define.
