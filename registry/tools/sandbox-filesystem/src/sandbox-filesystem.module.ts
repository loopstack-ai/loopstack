import { Module } from '@nestjs/common';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxCreateDirectory } from './tools/sandbox-create-directory.tool.js';
import { SandboxDelete } from './tools/sandbox-delete.tool.js';
import { SandboxExists } from './tools/sandbox-exists.tool.js';
import { SandboxFileInfo } from './tools/sandbox-file-info.tool.js';
import { SandboxListDirectory } from './tools/sandbox-list-directory.tool.js';
import { SandboxReadFile } from './tools/sandbox-read-file.tool.js';
import { SandboxWriteFile } from './tools/sandbox-write-file.tool.js';

/**
 * NestJS module that provides filesystem tools for operating inside Docker sandbox containers — read,
 * write, list, create-directory, delete, exists, and file-info (`SandboxReadFile`, `SandboxWriteFile`,
 * `SandboxListDirectory`, `SandboxCreateDirectory`, `SandboxDelete`, `SandboxExists`, `SandboxFileInfo`).
 *
 * Registration:
 * - `SandboxFilesystemModule` — bare import; registers all sandbox filesystem tools.
 *
 * Requires: a running Docker daemon on the host; imports `SandboxToolModule` automatically, so the
 * container lifecycle tools (`SandboxInit`, `SandboxCommand`, `SandboxDestroy`) are available too.
 *
 * @public
 */
@Module({
  imports: [SandboxToolModule],
  providers: [
    SandboxReadFile,
    SandboxWriteFile,
    SandboxListDirectory,
    SandboxCreateDirectory,
    SandboxDelete,
    SandboxExists,
    SandboxFileInfo,
  ],
  exports: [
    SandboxReadFile,
    SandboxWriteFile,
    SandboxListDirectory,
    SandboxCreateDirectory,
    SandboxDelete,
    SandboxExists,
    SandboxFileInfo,
  ],
})
export class SandboxFilesystemModule {}
