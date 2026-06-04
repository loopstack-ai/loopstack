# Skill: Use the Loopstack Registry

## Overview

The Loopstack Registry is a collection of npm packages (`@loopstack/*`) providing pre-built tools, feature modules, and example workflows. Always check the registry before building a custom tool — the functionality you need may already exist.

## Discovering Packages

Search the registry at `https://loopstack.ai/registry` or query the registry API for available packages by name or category.

## Installing a Registry Package

Install via npm:

```bash
npm install @loopstack/<package-name>
```

## What's Inside an Installed Package

Every registry package in `node_modules/@loopstack/<package-name>/` contains:

| Path           | Description                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `README.md`    | Usage documentation — tools provided, how to import and use them                          |
| `SETUP.md`     | Setup instructions — module registration, required config                                 |
| `dist/`        | Compiled JavaScript (what gets imported at runtime)                                       |
| `src/`         | Full TypeScript source — only published for example/template packages, not features/tools |
| `package.json` | Contains `loopstack` metadata field describing modules and workflows                      |

## Inspecting a Package Before Committing

To explore a package without adding it to the project, install it in a temporary directory:

```bash
mkdir -p /tmp/loopstack-inspect && cd /tmp/loopstack-inspect
npm init -y && npm install @loopstack/<package-name>
```

Then review `node_modules/@loopstack/<package-name>/README.md`, `SETUP.md`, and `src/` to verify the package does what you need.

## Package Metadata (`package.json`)

Registry packages declare their NestJS modules and workflows in a `loopstack` field:

```json
{
  "loopstack": {
    "modules": [
      {
        "path": "src/my.module.ts",
        "className": "MyModule"
      }
    ],
    "workflows": [
      {
        "path": "src/workflows/my.workflow.ts",
        "className": "MyWorkflow",
        "propertyName": "myWorkflow"
      }
    ]
  }
}
```

Use this to identify which module class to import and which workflows are available. Whether a package can be installed via `loopstack add` (copying sources into the project) is controlled by the registry entry's `allowInstallSources` flag, not by anything in `package.json`. Only example and template packages have this enabled.

## Registering in Your App

After installing, import the package's module in your app module:

```typescript
import { MyFeatureModule } from '@loopstack/<package-name>';

@Module({
  imports: [MyFeatureModule],
  // ...
})
export class AppModule {}
```

The module exports its tools, making them available for constructor injection in your workflows.

## Reading Source Code

When in doubt about a tool's behavior — its input schema, return type, or side effects — read the source directly:

```
node_modules/@loopstack/<package-name>/src/tools/<tool-name>.tool.ts
```

Look for:

- `@Tool({ name, description, schema })` — the name, description (seen by LLMs), and Zod schema for accepted arguments
- `handle()` method — the actual implementation
- `ToolResult` return — what data comes back
