# Setup

## Install

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
  @InjectWorkflow() oAuth: OAuthWorkflow;
}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
