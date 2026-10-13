Here are your upcoming events:

{{#each events}}

- **{{#if this.summary}}{{ this.summary }}{{else}}(no title){{/if}}** — {{ this.start }} to {{ this.end }}
  {{/each}}

{{#unless events}}
No upcoming events found.
{{/unless}}
