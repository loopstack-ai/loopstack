# Setup

There are two ways to add this tool to your Loopstack project. Both install it as an npm dependency — tool packages do not ship their sources, so `loopstack add` is not supported.

**Note:** This module requires `@loopstack/sandbox-tool` as a dependency.

## Option 1: `loopstack install` (recommended)

```bash
loopstack install @loopstack/sandbox-filesystem
```

This installs the package as an npm dependency and automatically registers the module.

- The module is imported directly from `node_modules`
- The CLI handles module registration for you (imports, module setup)

## Option 2: Manual `npm install`

```bash
npm install --save @loopstack/sandbox-filesystem
```

This installs the package as an npm dependency without any automatic configuration.

After installing, you need to manually register the module:

1. Add `SandboxFilesystemModule` to the imports of your module (e.g. `default.module.ts`):

```typescript
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';

@Module({
  imports: [SandboxFilesystemModule],
})
export class DefaultModule {}
```

See [Modules](https://loopstack.ai/docs/building-with-loopstack/creating-a-module) and [Workspaces](https://loopstack.ai/docs/building-with-loopstack/creating-workspaces) for more information.
