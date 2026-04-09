Here are your upcoming events:

{{#each events}}

- **{{ this.summary }}** — {{ this.start }} to {{ this.end }}
  {{/each}}

{{#unless events}}
No upcoming events found.
{{/unless}}
