# Secrets Verified

The following secrets are now stored:

{{#each secretKeys}}

- **{{this.key}}**: {{#if this.hasValue}}has value{{else}}no value{{/if}}
  {{/each}}
