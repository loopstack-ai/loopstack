import { Module } from '@nestjs/common';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxCreateDirectory } from './tools/sandbox-create-directory.tool';
import { SandboxDelete } from './tools/sandbox-delete.tool';
import { SandboxExists } from './tools/sandbox-exists.tool';
import { SandboxFileInfo } from './tools/sandbox-file-info.tool';
import { SandboxListDirectory } from './tools/sandbox-list-directory.tool';
import { SandboxReadFile } from './tools/sandbox-read-file.tool';
import { SandboxWriteFile } from './tools/sandbox-write-file.tool';

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
