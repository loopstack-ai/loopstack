---
title: API: @loopstack/local-file-explorer-module
description: Public API reference for @loopstack/local-file-explorer-module
includeInLlmsFullTxt: false
---

# API: @loopstack/local-file-explorer-module

## Classes

### FileApiService

Service that exposes workspace-scoped file tree and file content reads, parsing workflow YAML into
`workflowConfig` where present; inject it for higher-level local file access.

```ts
import { FileApiService } from '@loopstack/local-file-explorer-module';
```

**Provided by:** `LocalFileExplorerModule`

```ts
export class FileApiService {
  constructor(fileSystemService: FileSystemService);
  getFileTree(_workspaceClassName: string): Promise<FileExplorerNodeDto[]>;
  getFileContent(_workspaceClassName: string, filePath: string): Promise<FileContentDto>;
}
```

### FileContentDto

Result for a local file read — the file `path`, its `content`, and an optional parsed `workflowConfig`
for workflow YAML files.

```ts
import { FileContentDto } from '@loopstack/local-file-explorer-module';
```

```ts
export class FileContentDto {
  path: string;
  content: string;
  workflowConfig?: Record<string, unknown>;
}
```

### FileExplorerNodeDto

Result representing a node in the local file tree — a file or folder with id, name, path, type, and
optional children.

```ts
import { FileExplorerNodeDto } from '@loopstack/local-file-explorer-module';
```

```ts
export class FileExplorerNodeDto {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileExplorerNodeDto[];
}
```

### FileSystemService

Service that performs path-safe local filesystem access — resolves the workspace root, builds the file
tree, reads file contents, and guards against directory traversal; inject it for programmatic file access.

```ts
import { FileSystemService } from '@loopstack/local-file-explorer-module';
```

**Provided by:** `LocalFileExplorerModule`

```ts
export class FileSystemService {
  constructor(configService: ConfigService);
  getWorkspaceRootPath(): string;
  validatePath(basePath: string, targetPath: string): boolean;
  buildFileTree(rootPath: string, relativePath?: string): Promise<FileExplorerNodeDto[]>;
  readFileContent(filePath: string, maxSize?: number): Promise<string | null>;
  exists(filePath: string): Promise<boolean>;
}
```

### LocalFileExplorerModule

NestJS module that provides workspace-scoped REST endpoints for browsing and
reading the local filesystem (`LocalFileExplorerController`), plus the
`FileApiService` and `FileSystemService` for programmatic file access.

Registration:

- `LocalFileExplorerModule` — bare import. Enough for most apps: the controller
  and services are wired up automatically and the endpoints go live.
- `LocalFileExplorerModule.forFeature(config?: { enabled?: boolean; environments?: string[] })`
  — use to register it as a Studio feature flag (lights up the file-explorer
  panel) and optionally scope it to specific environment names.

Requires: nothing beyond importing the module.

```ts
import { LocalFileExplorerModule } from '@loopstack/local-file-explorer-module';
```

```ts
export class LocalFileExplorerModule {
  static forFeature(config?: { enabled?: boolean; environments?: string[] }): DynamicModule;
}
```
