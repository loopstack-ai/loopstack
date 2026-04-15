import { z } from 'zod';
import { BaseWorkflow, Final, Initial, InjectTool, ToolResult, Transition, Workflow } from '@loopstack/common';
import { MessageDocument } from '@loopstack/core';
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

interface SandboxInitResult {
  containerId: string;
  dockerId: string;
}

interface SandboxCreateDirectoryResult {
  path: string;
  created: boolean;
}

interface SandboxWriteFileResult {
  path: string;
  bytesWritten: number;
}

interface SandboxReadFileResult {
  content: string;
  encoding: string;
}

interface SandboxListDirectoryResult {
  path: string;
  entries: FileEntry[];
}

interface SandboxExistsResult {
  path: string;
  exists: boolean;
  type: string | null;
}

interface SandboxFileInfoResult {
  path: string;
  name: string;
  type: string;
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifiedAt: string;
  accessedAt: string;
  createdAt: string;
}

interface SandboxDeleteResult {
  path: string;
  deleted: boolean;
}

interface SandboxDestroyResult {
  containerId: string;
  removed: boolean;
}

@Workflow({
  uiConfig: __dirname + '/sandbox-example.ui.yaml',
  schema: z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
})
export class SandboxExampleWorkflow extends BaseWorkflow<{ outputDir: string }> {
  containerId?: string;
  fileContent?: string;
  fileList?: FileEntry[];

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

  @Initial({ to: 'sandbox_ready' })
  async initSandbox(args: { outputDir: string }) {
    const initResult: ToolResult<SandboxInitResult> = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-filesystem-sandbox',
      projectOutPath: args.outputDir,
      rootPath: 'workspace',
    });

    this.containerId = initResult.data!.containerId;

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox initialized successfully. Container ID: ${initResult.data!.containerId}, Docker ID: ${initResult.data!.dockerId}`,
    });
  }

  @Transition({ from: 'sandbox_ready', to: 'dir_created' })
  async createDir() {
    const mkdirResult: ToolResult<SandboxCreateDirectoryResult> = await this.sandboxCreateDirectory.call({
      containerId: this.containerId!,
      path: '/workspace',
      recursive: true,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Directory created: ${mkdirResult.data!.path} (created: ${mkdirResult.data!.created})`,
    });
  }

  @Transition({ from: 'dir_created', to: 'file_written' })
  async writeFile() {
    const writeResult: ToolResult<SandboxWriteFileResult> = await this.sandboxWriteFile.call({
      containerId: this.containerId!,
      path: '/workspace/result.txt',
      content: 'Hello from sandbox!',
      encoding: 'utf8',
      createParentDirs: true,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `File written: ${writeResult.data!.path} (${writeResult.data!.bytesWritten} bytes)`,
    });
  }

  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile() {
    const readResult: ToolResult<SandboxReadFileResult> = await this.sandboxReadFile.call({
      containerId: this.containerId!,
      path: '/workspace/result.txt',
      encoding: 'utf8',
    });

    this.fileContent = readResult.data!.content;

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `File read successfully. Content: "${readResult.data!.content}" (encoding: ${readResult.data!.encoding})`,
    });
  }

  @Transition({ from: 'file_read', to: 'dir_listed' })
  async listDir() {
    const listResult: ToolResult<SandboxListDirectoryResult> = await this.sandboxListDirectory.call({
      containerId: this.containerId!,
      path: '/workspace',
      recursive: false,
    });

    this.fileList = listResult.data!.entries;

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Directory listing for ${listResult.data!.path}: ${this.formatEntries(listResult.data!.entries)}`,
    });
  }

  @Transition({ from: 'dir_listed', to: 'existence_checked' })
  async checkExists() {
    const existsResult: ToolResult<SandboxExistsResult> = await this.sandboxExists.call({
      containerId: this.containerId!,
      path: '/workspace/result.txt',
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `File existence check: ${existsResult.data!.path} exists=${existsResult.data!.exists}, type=${existsResult.data!.type}`,
    });
  }

  @Transition({ from: 'existence_checked', to: 'info_retrieved' })
  async getInfo() {
    const infoResult: ToolResult<SandboxFileInfoResult> = await this.sandboxFileInfo.call({
      containerId: this.containerId!,
      path: '/workspace/result.txt',
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `File info for ${infoResult.data!.name}: type=${infoResult.data!.type}, size=${infoResult.data!.size} bytes, permissions=${infoResult.data!.permissions}, owner=${infoResult.data!.owner}`,
    });
  }

  @Transition({ from: 'info_retrieved', to: 'file_deleted' })
  async deleteFile() {
    const deleteResult: ToolResult<SandboxDeleteResult> = await this.sandboxDelete.call({
      containerId: this.containerId!,
      path: '/workspace/result.txt',
      recursive: false,
      force: true,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `File deleted: ${deleteResult.data!.path} (deleted: ${deleteResult.data!.deleted})`,
    });
  }

  @Final({ from: 'file_deleted' })
  async destroySandbox() {
    const destroyResult: ToolResult<SandboxDestroyResult> = await this.sandboxDestroy.call({
      containerId: this.containerId!,
      removeContainer: true,
    });

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox destroyed. Container ${destroyResult.data!.containerId} removed=${destroyResult.data!.removed}`,
    });
  }

  private formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) {
      return '(empty)';
    }
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
