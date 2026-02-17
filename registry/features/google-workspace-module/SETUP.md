# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack install` (recommended)

```bash
loopstack install @loopstack/google-workspace-module
```

This installs the package as an npm dependency and automatically registers the module — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module registration for you (imports, module setup)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 2: `loopstack add`

```bash
loopstack add @loopstack/google-workspace-module
```

This copies the source files into your project directory and automatically registers the module in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module registration for you (imports, module setup)
- Best for getting started or when you want to modify the code

## Option 3: Manual `npm install`

```bash
npm install --save @loopstack/google-workspace-module
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module:

1. Add `GoogleWorkspaceModule` alongside `OAuthModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { GoogleWorkspaceModule } from '@loopstack/google-workspace-module';
import { OAuthModule } from '@loopstack/oauth-module';

@Module({
  imports: [OAuthModule, GoogleWorkspaceModule],
})
export class DefaultModule {}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.

## Configure Environment Variables

| Variable                    | Required | Default           | Description                     |
| --------------------------- | -------- | ----------------- | ------------------------------- |
| `GOOGLE_CLIENT_ID`          | Yes      | —                 | Your Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET`      | Yes      | —                 | Your Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | No       | `/oauth/callback` | The OAuth redirect URI          |

You can obtain client credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
