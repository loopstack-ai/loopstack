# @loopstack/cli-module

The Loopstack CLI provides commands for adding and installing packages from the Loopstack registry. It handles npm installation, source file copying, and automatic module/workflow registration in your project.

## Commands

### `loopstack add <package>`

Copies the source files of a registry package into your project and registers its modules and workflows.

```bash
loopstack add @loopstack/google-oauth-calendar-example
```

**What it does:**

1. Installs the npm package (if not already installed)
2. Copies the package's `src/` directory into your project
3. Registers all configured modules in your target module file (e.g. `default.module.ts`)
4. Registers all configured workflows in your target workspace file (e.g. `default.workspace.ts`)

Use `add` when you want full access to the source code for learning, exploring, or customizing.

**Options:**

| Flag                          | Description                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-d, --dir <directory>`       | Target directory for the copied source files. If not specified, the CLI prompts with a default based on the package name.                                                         |
| `-m, --module <module>`       | Target module file to register in (e.g. `src/default.module.ts`). If not specified, the CLI searches for `.module.ts` files and prompts if multiple are found.                    |
| `-w, --workspace <workspace>` | Target workspace file to register workflows in (e.g. `src/default.workspace.ts`). If not specified, the CLI searches for `.workspace.ts` files and prompts if multiple are found. |

**Example:**

```bash
loopstack add @loopstack/google-oauth-calendar-example -d src/calendar -m src/default.module.ts -w src/default.workspace.ts
```

---

### `loopstack install <package>`

Installs a registry package as an npm dependency and registers its modules and workflows — without copying any source files.

```bash
loopstack install @loopstack/google-oauth-calendar-example
```

**What it does:**

1. Installs the npm package (if not already installed)
2. Registers all configured modules in your target module file, importing from the package name (e.g. `import { ... } from '@loopstack/google-oauth-calendar-example'`)
3. Registers all configured workflows in your target workspace file

Use `install` when you don't need to modify the source code and want to receive updates via npm.

**Options:**

| Flag                          | Description                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-m, --module <module>`       | Target module file to register in (e.g. `src/default.module.ts`). If not specified, the CLI searches for `.module.ts` files and prompts if multiple are found.                    |
| `-w, --workspace <workspace>` | Target workspace file to register workflows in (e.g. `src/default.workspace.ts`). If not specified, the CLI searches for `.workspace.ts` files and prompts if multiple are found. |

---

### `loopstack configure <package>`

Runs only the module and workflow registration for a package that is already installed via npm. Skips registry lookup and npm installation entirely.

```bash
loopstack configure @loopstack/oauth-module
```

**What it does:**

1. Reads the `loopstack` config from the installed package's `package.json`
2. Registers all configured modules in your target module file
3. Registers all configured workflows in your target workspace file

Use `configure` when the package is already in your `node_modules` (e.g. installed as a transitive dependency or after a manual `npm install`) and you just need to wire it into your project.

It supports both modes:

- **Without `--dir`** (dependency-style): imports use the package name (e.g. `import { ... } from '@loopstack/oauth-module'`)
- **With `--dir`** (add-style): imports use relative paths from the copied source directory (e.g. `import { ... } from './my-feature/my.module'`)

**Options:**

| Flag                          | Description                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-d, --dir <directory>`       | Directory where source files were copied to. When provided, local module/workflow entries use relative import paths instead of the package name.                                  |
| `-m, --module <module>`       | Target module file to register in (e.g. `src/default.module.ts`). If not specified, the CLI searches for `.module.ts` files and prompts if multiple are found.                    |
| `-w, --workspace <workspace>` | Target workspace file to register workflows in (e.g. `src/default.workspace.ts`). If not specified, the CLI searches for `.workspace.ts` files and prompts if multiple are found. |

**Examples:**

```bash
# Dependency-style: imports from package name
loopstack configure @loopstack/oauth-module

# Add-style: imports from copied source directory
loopstack configure @loopstack/google-oauth-calendar-example -d src/calendar-example
```

---

## Automatic Registration

Both `add` and `install` perform automatic module and workflow registration based on the `loopstack` configuration in the package's `package.json`.

### How module registration works

For each module entry in the config, the CLI:

1. Adds an import statement to the target module file
2. Adds the module class to the `@Module()` decorator's `imports` array

Modules can come from two sources:

- **Local** (the package's own source): the import path is computed relative to the target module file (for `add`) or uses the package name (for `install`)
- **Dependency** (another npm package): the import always uses the dependency's package name directly

### How workflow registration works

For each workflow entry in the config, the CLI:

1. Adds an import statement to the target workspace file
2. Adds a property with the `@InjectWorkflow()` decorator to the workspace class

Like modules, workflows can come from the package's own source or from a dependency.

### Package configuration

Packages declare their registration config under the `loopstack` key in `package.json`:

```json
{
  "loopstack": {
    "installModes": ["add", "install"],
    "modules": [
      {
        "path": "src/calendar-example.module.ts",
        "className": "CalendarExampleModule"
      },
      {
        "package": "@loopstack/oauth-module",
        "className": "OAuthModule"
      },
      {
        "package": "@loopstack/google-workspace-module",
        "className": "GoogleWorkspaceModule"
      }
    ],
    "workflows": [
      {
        "path": "src/workflows/calendar-summary.workflow.ts",
        "className": "CalendarSummaryWorkflow",
        "propertyName": "calendarSummary"
      },
      {
        "package": "@loopstack/oauth-module",
        "className": "OAuthWorkflow",
        "propertyName": "oAuth"
      }
    ]
  }
}
```

**Module entries:**

| Field       | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| `path`      | Path to the module file within the package (local modules only) |
| `package`   | npm package name (dependency modules only)                      |
| `className` | The module class name to import and register                    |

An entry must have either `path` (local) or `package` (dependency), not both.

**Workflow entries:**

| Field          | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `path`         | Path to the workflow file within the package (local workflows only)     |
| `package`      | npm package name (dependency workflows only)                            |
| `className`    | The workflow class name to import                                       |
| `propertyName` | The property name to use in the workspace class                         |
| `options`      | Optional object passed as argument to the `@InjectWorkflow()` decorator |

**Install modes:**

The `installModes` array controls which commands a package supports. Valid values are `"add"` and `"install"`. If omitted, both modes are allowed.

---

## Differences between `add`, `install`, and `configure`

| Aspect                       | `add`                                                | `install`              | `configure`                            |
| ---------------------------- | ---------------------------------------------------- | ---------------------- | -------------------------------------- |
| Registry lookup              | Yes                                                  | Yes                    | No                                     |
| npm install                  | Yes                                                  | Yes                    | No (package must already be installed) |
| Source files                 | Copied into your project                             | Stay in `node_modules` | Stay in `node_modules`                 |
| Import paths (local entries) | Relative (e.g. `./calendar/calendar-example.module`) | Package name           | Package name                           |
| `--dir` flag                 | Supported                                            | Not applicable         | Not applicable                         |
| Customizable source          | Yes                                                  | No                     | No                                     |
| Receives npm updates         | No (your copy is independent)                        | Yes                    | Yes                                    |
