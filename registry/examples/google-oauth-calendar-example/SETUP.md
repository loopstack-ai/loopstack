# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack add` (recommended)

```bash
loopstack add @loopstack/google-oauth-calendar-example
```

This copies the source files into your project directory and automatically registers the module and workflows in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best for getting started or when you want to modify the code

## Option 2: `loopstack install`

```bash
loopstack install @loopstack/google-oauth-calendar-example
```

This installs the package as an npm dependency and automatically registers the module and workflows — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module and workflow registration for you (imports, module setup, workflow injection)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 3: Manual `npm install`

```bash
npm install --save @loopstack/google-oauth-calendar-example
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `CalendarExampleModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { CalendarExampleModule } from '@loopstack/google-oauth-calendar-example';

@Module({
  imports: [CalendarExampleModule],
})
export class DefaultModule {}
```

2. Inject the `CalendarSummaryWorkflow` workflow into your workspace class using the `@InjectWorkflow()` decorator:

```typescript
import { CalendarSummaryWorkflow } from '@loopstack/google-oauth-calendar-example';

export class DefaultWorkspace {
  @InjectWorkflow() calendarSummary: CalendarSummaryWorkflow;
}
```

## Add oauth workflow

Additionally to the installation above, you need to add `OAuthWorkflow` to your workspace (e.g. `default.workspace.ts`):
This enables the workflow to execute the authentication flow when needed.

```typescript
import { OAuthWorkflow } from '@loopstack/oauth-module';

@Workspace({
  workflows: [],
})
export class DefaultWorkspace {
  @InjectWorkflow() oAuth: OAuthWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure Google OAuth

You need a Google OAuth provider module registered with `@loopstack/oauth-module`. Set the following environment variables:

- `GOOGLE_CLIENT_ID` — Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Your Google OAuth client secret
- `GOOGLE_OAUTH_REDIRECT_URI` — The redirect URI (defaults to `/oauth/callback`)
