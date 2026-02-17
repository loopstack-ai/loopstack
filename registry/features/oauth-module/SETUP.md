# Setup

There are three ways to add this module to your Loopstack project.

## Option 1: `loopstack install` (recommended)

```bash
loopstack install @loopstack/oauth-module
```

This installs the package as an npm dependency and automatically registers the module and workflows — without copying any source files into your project.

- The module is imported directly from `node_modules`
- The CLI handles module and workflow registration for you (imports, module setup, workspace setup)
- Best when you don't need to modify the source code and want to receive updates via npm

## Option 2: `loopstack add`

```bash
loopstack add @loopstack/oauth-module
```

This copies the source files into your project directory and automatically registers the module and workflows in your application.

- Full access to the source code for learning, exploring and customizing
- The CLI handles module and workflow registration for you (imports, module setup, workspace setup)
- Best for getting started or when you want to modify the code

## Option 3: Manual `npm install`

```bash
npm install --save @loopstack/oauth-module
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module and workflows:

1. Add `OAuthModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { OAuthModule } from '@loopstack/oauth-module';

@Module({
  imports: [OAuthModule],
})
export class DefaultModule {}
```

2. Add `OAuthWorkflow` to your workspace (e.g. `default.workspace.ts`):

```typescript
import { OAuthWorkflow } from '@loopstack/oauth-module';

@Workspace({
  workflows: [],
})
export class DefaultWorkspace {
  @InjectWorkflow() oAuthWorkflow: OAuthWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
