import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DefineHelper, InjectTool, WithArguments, WithState, Workflow } from '@loopstack/common';
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
@Workflow({
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
export class SandboxExampleWorkflow {
  // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
  @InjectTool() sandboxInit: SandboxInit;
  @InjectTool() sandboxDestroy: SandboxDestroy;

  // Filesystem tools (from @loopstack/sandbox-filesystem)
  @InjectTool() sandboxWriteFile: SandboxWriteFile;
  @InjectTool() sandboxReadFile: SandboxReadFile;
  @InjectTool() sandboxListDirectory: SandboxListDirectory;
  @InjectTool() sandboxCreateDirectory: SandboxCreateDirectory;
  @InjectTool() sandboxDelete: SandboxDelete;
  @InjectTool() sandboxExists: SandboxExists;
  @InjectTool() sandboxFileInfo: SandboxFileInfo;

  // Chat message tool for outputting info to the interface
  @InjectTool() createChatMessage: CreateChatMessage;

  @DefineHelper()
  formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) {
      return '(empty)';
    }
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
