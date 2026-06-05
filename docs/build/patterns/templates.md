# Template Expressions

Loopstack uses Handlebars templates for rendering dynamic text content. Templates are rendered via `this.render()`, available directly on `BaseWorkflow` (like `documentStore`).

## Setup

```typescript
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

@Workflow({})
export class MyWorkflow extends BaseWorkflow {
  // this.render() is available from BaseWorkflow — no injection needed
}
```

## Usage

```typescript
const rendered = this.render(__dirname + '/templates/prompt.md', {
  subject: args.subject,
  items: state.items,
});
```

Template file (`templates/prompt.md`):

```markdown
Write a haiku about {{subject}}.

{{#each items}}

- {{this.name}}
  {{/each}}
```

## Passing Data

Pass any data as the second argument to `this.render()`:

```typescript
// Workflow args (from ctx parameter)
const args = ctx.args as { subject: string };
this.render(templatePath, { subject: args.subject });

// Workflow state (from state parameter)
this.render(templatePath, { items: state.items, count: state.counter });

// Mixed data
this.render(templatePath, {
  prompt: args.prompt,
  history: state.conversationHistory,
  timestamp: new Date().toISOString(),
});
```

## Handlebars Syntax

### Variables

```markdown
Hello {{name}}
Nested: {{user.profile.email}}
Array element: {{items.[0]}}
```

### Conditionals

```markdown
{{#if isActive}}Welcome back!{{else}}Please log in{{/if}}
{{#unless isBlocked}}Access granted{{/unless}}
```

### Iteration

```markdown
{{#each items}}

- {{this.name}}: {{this.value}}
  {{else}}
  No items found.
  {{/each}}
```

### Context Scoping

```markdown
{{#with user}}{{name}} ({{email}}){{/with}}
```

## Multi-line Template Example

```markdown
# Events This Week

{{#each events}}

- **{{this.summary}}**: {{this.start}} – {{this.end}}
  {{/each}}

{{#unless events}}
No events found.
{{/unless}}
```

## When to Use Templates

| Scenario                            | Approach                          |
| ----------------------------------- | --------------------------------- |
| LLM prompts with variables          | `this.render(templatePath, data)` |
| Simple string interpolation         | Template literals in TypeScript   |
| Complex multi-line content          | Handlebars template file          |
| Prompts with iteration/conditionals | Handlebars with `#each`, `#if`    |

## YAML UI Config

YAML widget configuration uses `transition` values that reference method names and `enabledWhen` for conditional visibility. These are not template expressions — they are static configuration:

```yaml
ui:
  widgets:
    - widget: prompt-input
      enabledWhen: [waiting_for_user]
      options:
        transition: userMessage
```

## Registry References

- [prompt-example-workflow](https://loopstack.ai/registry/loopstack-prompt-example-workflow) — Uses `this.render()` for Handlebars prompt templates
- [meeting-notes-example-workflow](https://loopstack.ai/registry/loopstack-meeting-notes-example-workflow) — Uses templates for structured note rendering
