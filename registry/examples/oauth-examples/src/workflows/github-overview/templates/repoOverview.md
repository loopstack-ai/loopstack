## Authenticated User

**{{ user.login }}** {{#if user.name}}({{ user.name }}){{/if}} — {{ user.publicRepos }} public repos

{{#if orgs}}

### Organizations

{{#each orgs}}

- **{{ this.login }}** {{#if this.description}}— {{ this.description }}{{/if}}
  {{/each}}
  {{/if}}

---

## Repository: [{{ repo.fullName }}]({{ repo.htmlUrl }})

{{ repo.description }}

| Language            | Stars            | Forks            | Open Issues           | Default Branch           |
| ------------------- | ---------------- | ---------------- | --------------------- | ------------------------ |
| {{ repo.language }} | {{ repo.stars }} | {{ repo.forks }} | {{ repo.openIssues }} | {{ repo.defaultBranch }} |

### Branches

{{#each branches}}

- `{{ this.name }}` {{#if this.protected}}(protected){{/if}}
  {{/each}}

---

### Open Issues

{{#each issues}}

- [#{{ this.number }}]({{ this.htmlUrl }}) {{ this.title }} — @{{ this.user }}
  {{/each}}
  {{#unless issues}}
  No open issues.
  {{/unless}}

### Open Pull Requests

{{#each pullRequests}}

- [#{{ this.number }}]({{ this.htmlUrl }}) {{ this.title }} — @{{ this.user }} {{#if this.draft}}(draft){{/if}}
  {{/each}}
  {{#unless pullRequests}}
  No open pull requests.
  {{/unless}}

---

### Root Directory

{{#each directoryEntries}}

- {{ this.type }} `{{ this.name }}`
  {{/each}}

### Recent Workflow Runs

{{#each workflowRuns}}

- [{{ this.name }}]({{ this.htmlUrl }}) — {{ this.status }} {{#if this.conclusion}}({{ this.conclusion }}){{/if}}
  {{/each}}
  {{#unless workflowRuns}}
  No workflow runs found.
  {{/unless}}

### Code Search Results

{{#each searchResults}}

- `{{ this.path }}` in {{ this.repository }}
  {{/each}}
  {{#unless searchResults}}
  No code search results.
  {{/unless}}
