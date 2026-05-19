import { Module } from '@nestjs/common';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxCreateDirectory } from './tools/sandbox-create-directory.tool.js';
import { SandboxDelete } from './tools/sandbox-delete.tool.js';
import { SandboxExists } from './tools/sandbox-exists.tool.js';
import { SandboxFileInfo } from './tools/sandbox-file-info.tool.js';
import { SandboxListDirectory } from './tools/sandbox-list-directory.tool.js';
import { SandboxReadFile } from './tools/sandbox-read-file.tool.js';
import { SandboxWriteFile } from './tools/sandbox-write-file.tool.js';

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
