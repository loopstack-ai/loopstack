import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseWorkflow, DOCUMENT_STORE, MessageDocument, ToolResult, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore, LoopstackContext } from '@loopstack/common';
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

interface SandboxExampleState {
  containerId?: string;
  fileContent?: string;
  fileList?: FileEntry[];
}

@Workflow({
  title: 'Sandbox Filesystem Example',
  description:
    'This workflow demonstrates how to use sandbox containers for isolated filesystem operations. It initializes a Docker container, performs file operations, and cleans up the sandbox.',
  schema: z.object({
    outputDir: z.string().default(process.cwd() + '/out'),
  }),
})
export class SandboxExampleWorkflow extends BaseWorkflow<{ outputDir: string }, SandboxExampleState> {
  constructor(
    // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
    private readonly sandboxInit: SandboxInit,
    private readonly sandboxDestroy: SandboxDestroy,
    // Filesystem tools (from @loopstack/sandbox-filesystem)
    private readonly sandboxWriteFile: SandboxWriteFile,
    private readonly sandboxReadFile: SandboxReadFile,
    private readonly sandboxListDirectory: SandboxListDirectory,
    private readonly sandboxCreateDirectory: SandboxCreateDirectory,
    private readonly sandboxDelete: SandboxDelete,
    private readonly sandboxExists: SandboxExists,
    private readonly sandboxFileInfo: SandboxFileInfo,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Transition({ to: 'sandbox_ready' })
  async initSandbox(state: SandboxExampleState, ctx: LoopstackContext): Promise<SandboxExampleState> {
    const args = ctx.args as { outputDir: string };
    const initResult: ToolResult<SandboxInitResult> = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-filesystem-sandbox',
      projectOutPath: args.outputDir,
      rootPath: 'workspace',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox initialized successfully. Container ID: ${initResult.data!.containerId}, Docker ID: ${initResult.data!.dockerId}`,
    });
    return { ...state, containerId: initResult.data!.containerId };
  }

  @Transition({ from: 'sandbox_ready', to: 'dir_created' })
  async createDir(state: SandboxExampleState): Promise<SandboxExampleState> {
    const mkdirResult: ToolResult<SandboxCreateDirectoryResult> = await this.sandboxCreateDirectory.call({
      containerId: state.containerId!,
      path: '/workspace',
      recursive: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Directory created: ${mkdirResult.data!.path} (created: ${mkdirResult.data!.created})`,
    });
    return state;
  }

  @Transition({ from: 'dir_created', to: 'file_written' })
  async writeFile(state: SandboxExampleState): Promise<SandboxExampleState> {
    const writeResult: ToolResult<SandboxWriteFileResult> = await this.sandboxWriteFile.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      content: 'Hello from sandbox!',
      encoding: 'utf8',
      createParentDirs: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `File written: ${writeResult.data!.path} (${writeResult.data!.bytesWritten} bytes)`,
    });
    return state;
  }

  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile(state: SandboxExampleState): Promise<SandboxExampleState> {
    const readResult: ToolResult<SandboxReadFileResult> = await this.sandboxReadFile.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      encoding: 'utf8',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `File read successfully. Content: "${readResult.data!.content}" (encoding: ${readResult.data!.encoding})`,
    });
    return { ...state, fileContent: readResult.data!.content };
  }

  @Transition({ from: 'file_read', to: 'dir_listed' })
  async listDir(state: SandboxExampleState): Promise<SandboxExampleState> {
    const listResult: ToolResult<SandboxListDirectoryResult> = await this.sandboxListDirectory.call({
      containerId: state.containerId!,
      path: '/workspace',
      recursive: false,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Directory listing for ${listResult.data!.path}: ${this.formatEntries(listResult.data!.entries)}`,
    });
    return { ...state, fileList: listResult.data!.entries };
  }

  @Transition({ from: 'dir_listed', to: 'existence_checked' })
  async checkExists(state: SandboxExampleState): Promise<SandboxExampleState> {
    const existsResult: ToolResult<SandboxExistsResult> = await this.sandboxExists.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `File existence check: ${existsResult.data!.path} exists=${existsResult.data!.exists}, type=${existsResult.data!.type}`,
    });
    return state;
  }

  @Transition({ from: 'existence_checked', to: 'info_retrieved' })
  async getInfo(state: SandboxExampleState): Promise<SandboxExampleState> {
    const infoResult: ToolResult<SandboxFileInfoResult> = await this.sandboxFileInfo.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `File info for ${infoResult.data!.name}: type=${infoResult.data!.type}, size=${infoResult.data!.size} bytes, permissions=${infoResult.data!.permissions}, owner=${infoResult.data!.owner}`,
    });
    return state;
  }

  @Transition({ from: 'info_retrieved', to: 'file_deleted' })
  async deleteFile(state: SandboxExampleState): Promise<SandboxExampleState> {
    const deleteResult: ToolResult<SandboxDeleteResult> = await this.sandboxDelete.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      recursive: false,
      force: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `File deleted: ${deleteResult.data!.path} (deleted: ${deleteResult.data!.deleted})`,
    });
    return state;
  }

  @Transition({ from: 'file_deleted', to: 'end' })
  async destroySandbox(state: SandboxExampleState): Promise<unknown> {
    const destroyResult: ToolResult<SandboxDestroyResult> = await this.sandboxDestroy.call({
      containerId: state.containerId!,
      removeContainer: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox destroyed. Container ${destroyResult.data!.containerId} removed=${destroyResult.data!.removed}`,
    });
    return {};
  }

  private formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) {
      return '(empty)';
    }
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
