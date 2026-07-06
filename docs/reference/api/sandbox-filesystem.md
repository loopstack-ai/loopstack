---
title: 'API: @loopstack/sandbox-filesystem'
description: 'Public API reference for @loopstack/sandbox-filesystem'
includeInLlmsFullTxt: false
---

# API: @loopstack/sandbox-filesystem

## Classes

### SandboxCreateDirectory

Tool that creates a directory in a sandbox container, optionally creating parent directories.

```ts
import { SandboxCreateDirectory } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxCreateDirectory extends BaseTool<SandboxCreateDirectoryArgs, object, SandboxCreateDirectoryResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxCreateDirectoryArgs): Promise<ToolEnvelope<SandboxCreateDirectoryResult>>;
}
```

### SandboxDelete

Tool that deletes a file or directory in a sandbox container, with optional recursive and force flags.

```ts
import { SandboxDelete } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxDelete extends BaseTool<SandboxDeleteArgs, object, SandboxDeleteResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxDeleteArgs): Promise<ToolEnvelope<SandboxDeleteResult>>;
}
```

### SandboxExists

Tool that checks whether a path exists in a sandbox container and reports its type.

```ts
import { SandboxExists } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxExists extends BaseTool<SandboxExistsArgs, object, SandboxExistsResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxExistsArgs): Promise<ToolEnvelope<SandboxExistsResult>>;
}
```

### SandboxFileInfo

Tool that returns detailed metadata for a file or directory in a sandbox container — type, size,
permissions, owner/group, and timestamps.

```ts
import { SandboxFileInfo } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxFileInfo extends BaseTool<SandboxFileInfoArgs, object, SandboxFileInfoResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxFileInfoArgs): Promise<ToolEnvelope<SandboxFileInfoResult>>;
}
```

### SandboxFilesystemModule

NestJS module that provides filesystem tools for operating inside Docker sandbox containers — read,
write, list, create-directory, delete, exists, and file-info (`SandboxReadFile`, `SandboxWriteFile`,
`SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`).

Registration:

- `SandboxFilesystemModule` — bare import; registers all sandbox filesystem tools.

Requires: a running Docker daemon on the host; imports `SandboxToolModule` automatically, so the
container lifecycle tools (`SandboxInit`, `SandboxCommand`, `SandboxDestroy`) are available too.

```ts
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
```

```ts
export class SandboxFilesystemModule {}
```

### SandboxListDirectory

Tool that lists files and directories in a sandbox container, optionally recursively, with type and size.

```ts
import { SandboxListDirectory } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxListDirectory extends BaseTool<SandboxListDirectoryArgs, object, SandboxListDirectoryResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxListDirectoryArgs): Promise<ToolEnvelope<SandboxListDirectoryResult>>;
}
```

### SandboxReadFile

Tool that reads a file's contents from a sandbox container, as utf8 or base64.

```ts
import { SandboxReadFile } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxReadFile extends BaseTool<SandboxReadFileArgs, object, SandboxReadFileResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxReadFileArgs): Promise<ToolEnvelope<SandboxReadFileResult>>;
}
```

### SandboxWriteFile

Tool that writes content to a file in a sandbox container, optionally creating parent directories.

```ts
import { SandboxWriteFile } from '@loopstack/sandbox-filesystem';
```

**Provided by:** `SandboxFilesystemModule`

```ts
export class SandboxWriteFile extends BaseTool<SandboxWriteFileArgs, object, SandboxWriteFileResult> {
  constructor(sandboxCommand: SandboxCommand);
  protected handle(args: SandboxWriteFileArgs): Promise<ToolEnvelope<SandboxWriteFileResult>>;
}
```

## Interfaces

### SandboxCreateDirectoryResult

Result of `SandboxCreateDirectory`.

Reports the directory path and whether it was created.

```ts
import { SandboxCreateDirectoryResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxCreateDirectoryResult {
  path: string;
  created: boolean;
}
```

### SandboxDeleteResult

Result of `SandboxDelete`.

Reports the target path and whether it was deleted.

```ts
import { SandboxDeleteResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxDeleteResult {
  path: string;
  deleted: boolean;
}
```

### SandboxExistsResult

Result of `SandboxExists`.

Reports whether the path exists and, if so, its type (or `null` when absent).

```ts
import { SandboxExistsResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxExistsResult {
  path: string;
  exists: boolean;
  type: 'file' | 'directory' | 'symlink' | 'other' | null;
}
```

### SandboxFileInfoResult

Result of `SandboxFileInfo`.

Detailed metadata for a path — type, size, permissions, owner/group, and timestamps.

```ts
import { SandboxFileInfoResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxFileInfoResult {
  path: string;
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifiedAt: string;
  accessedAt: string;
  createdAt: string;
}
```

### SandboxListDirectoryResult

Result of `SandboxListDirectory`.

Reports the listed directory path and its entries (name, type, size, path).

```ts
import { SandboxListDirectoryResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxListDirectoryResult {
  path: string;
  entries: FileEntry[];
}
```

### SandboxReadFileResult

Result of `SandboxReadFile`.

Reports the file content and the encoding it was read with.

```ts
import { SandboxReadFileResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxReadFileResult {
  content: string;
  encoding: string;
}
```

### SandboxWriteFileResult

Result of `SandboxWriteFile`.

Reports the written path and the number of bytes written.

```ts
import { SandboxWriteFileResult } from '@loopstack/sandbox-filesystem';
```

```ts
export interface SandboxWriteFileResult {
  path: string;
  bytesWritten: number;
}
```

## Type Aliases

### SandboxCreateDirectoryArgs

Args for `SandboxCreateDirectory`.

Identifies the container and target directory path, with an optional recursive flag.

```ts
import { SandboxCreateDirectoryArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxCreateDirectoryArgs = z.infer<typeof inputSchema>;
```

### SandboxDeleteArgs

Args for `SandboxDelete`.

Identifies the container and target path, with optional recursive and force flags.

```ts
import { SandboxDeleteArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxDeleteArgs = z.infer<typeof inputSchema>;
```

### SandboxExistsArgs

Args for `SandboxExists`.

Identifies the container and the path to check for existence.

```ts
import { SandboxExistsArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxExistsArgs = z.infer<typeof inputSchema>;
```

### SandboxFileInfoArgs

Args for `SandboxFileInfo`.

Identifies the container and the path to inspect.

```ts
import { SandboxFileInfoArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxFileInfoArgs = z.infer<typeof inputSchema>;
```

### SandboxListDirectoryArgs

Args for `SandboxListDirectory`.

Identifies the container and directory path, with an optional recursive flag.

```ts
import { SandboxListDirectoryArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxListDirectoryArgs = z.infer<typeof inputSchema>;
```

### SandboxReadFileArgs

Args for `SandboxReadFile`.

Identifies the container, file path, and read encoding (utf8 or base64).

```ts
import { SandboxReadFileArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxReadFileArgs = z.infer<typeof inputSchema>;
```

### SandboxWriteFileArgs

Args for `SandboxWriteFile`.

Identifies the container, target path, content, encoding, and whether to create parent directories.

```ts
import { SandboxWriteFileArgs } from '@loopstack/sandbox-filesystem';
```

```ts
export type SandboxWriteFileArgs = z.infer<typeof inputSchema>;
```
