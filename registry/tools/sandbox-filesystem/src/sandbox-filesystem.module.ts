/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxCreateDirectory } from './tools/sandbox-create-directory.tool';
import { SandboxDelete } from './tools/sandbox-delete.tool';
import { SandboxExists } from './tools/sandbox-exists.tool';
import { SandboxFileInfo } from './tools/sandbox-file-info.tool';
import { SandboxListDirectory } from './tools/sandbox-list-directory.tool';
import { SandboxReadFile } from './tools/sandbox-read-file.tool';
import { SandboxWriteFile } from './tools/sandbox-write-file.tool';

@Module({
  imports: [LoopCoreModule, SandboxToolModule],
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
