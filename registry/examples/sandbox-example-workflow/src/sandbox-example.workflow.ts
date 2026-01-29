import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BlockConfig, Helper, Tool, WithArguments, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
import {
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxExists,
  SandboxFileInfo,
  SandboxListDirectory,
  SandboxReadFile,
  SandboxWriteFile,
} from '@loopstack/sandbox-filesystem';
import { SandboxDestroy, SandboxInit } from '@loopstack/sandbox-tool';

interface FileEntry {
  name: string;
  type: string;
  size: number;
  path: string;
}

@Injectable()
@BlockConfig({
  configFile: __dirname + '/sandbox-example.workflow.yaml',
})
@WithArguments(
  z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
)
@WithState(
  z.object({
    containerId: z.string().optional(),
    fileContent: z.string().optional(),
    fileList: z.array(z.any()).optional(),
  }),
)
export class SandboxExampleWorkflow extends WorkflowBase {
  // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
  @Tool() sandboxInit: SandboxInit;
  @Tool() sandboxDestroy: SandboxDestroy;

  // Filesystem tools (from @loopstack/sandbox-filesystem)
  @Tool() sandboxWriteFile: SandboxWriteFile;
  @Tool() sandboxReadFile: SandboxReadFile;
  @Tool() sandboxListDirectory: SandboxListDirectory;
  @Tool() sandboxCreateDirectory: SandboxCreateDirectory;
  @Tool() sandboxDelete: SandboxDelete;
  @Tool() sandboxExists: SandboxExists;
  @Tool() sandboxFileInfo: SandboxFileInfo;

  // Chat message tool for outputting info to the interface
  @Tool() createChatMessage: CreateChatMessage;

  @Helper()
  formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) {
      return '(empty)';
    }
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
