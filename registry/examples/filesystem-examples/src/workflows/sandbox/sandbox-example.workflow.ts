import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
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

interface SandboxExampleState {
  containerId?: string;
  fileContent?: string;
  fileList?: FileEntry[];
}

const SandboxExampleArgsSchema = z.object({
  outputDir: z.string().default(process.cwd() + '/out'),
});

type SandboxExampleArgs = z.infer<typeof SandboxExampleArgsSchema>;

@Workflow({
  title: 'Filesystem - Sandbox Example',
  description:
    'Demonstrates the full Docker sandbox lifecycle: init a container, perform file operations (write, read, list, delete), and destroy the sandbox. Useful for isolated execution of untrusted code.',
  schema: SandboxExampleArgsSchema,
})
export class SandboxExampleWorkflow extends BaseWorkflow<SandboxExampleArgs> {
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
  ) {
    super();
  }

  @Transition({ to: 'sandbox_ready' })
  async initSandbox(state: SandboxExampleState, ctx: RunContext<SandboxExampleArgs>) {
    const initResult = await this.sandboxInit.call({
      containerId: 'my-sandbox',
      imageName: 'node:18',
      containerName: 'my-filesystem-sandbox',
      projectOutPath: ctx.args.outputDir,
      rootPath: 'workspace',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Sandbox initialized successfully. Container ID: ${initResult.data.containerId}, Docker ID: ${initResult.data.dockerId}`,
    });
    this.assignState({ containerId: initResult.data.containerId });
  }

  @Transition({ from: 'sandbox_ready', to: 'dir_created' })
  async createDir(state: SandboxExampleState) {
    const mkdirResult = await this.sandboxCreateDirectory.call({
      containerId: state.containerId!,
      path: '/workspace',
      recursive: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Directory created: ${mkdirResult.data.path} (created: ${mkdirResult.data.created})`,
    });
  }

  @Transition({ from: 'dir_created', to: 'file_written' })
  async writeFile(state: SandboxExampleState) {
    const writeResult = await this.sandboxWriteFile.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      content: 'Hello from sandbox!',
      encoding: 'utf8',
      createParentDirs: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `File written: ${writeResult.data.path} (${writeResult.data.bytesWritten} bytes)`,
    });
  }

  @Transition({ from: 'file_written', to: 'file_read' })
  async readFile(state: SandboxExampleState) {
    const readResult = await this.sandboxReadFile.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      encoding: 'utf8',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `File read successfully. Content: "${readResult.data.content}" (encoding: ${readResult.data.encoding})`,
    });
    this.assignState({ fileContent: readResult.data.content });
  }

  @Transition({ from: 'file_read', to: 'dir_listed' })
  async listDir(state: SandboxExampleState) {
    const listResult = await this.sandboxListDirectory.call({
      containerId: state.containerId!,
      path: '/workspace',
      recursive: false,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Directory listing for ${listResult.data.path}: ${this.formatEntries(listResult.data.entries)}`,
    });
    this.assignState({ fileList: listResult.data.entries });
  }

  @Transition({ from: 'dir_listed', to: 'existence_checked' })
  async checkExists(state: SandboxExampleState) {
    const existsResult = await this.sandboxExists.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `File existence check: ${existsResult.data.path} exists=${existsResult.data.exists}, type=${existsResult.data.type}`,
    });
  }

  @Transition({ from: 'existence_checked', to: 'info_retrieved' })
  async getInfo(state: SandboxExampleState) {
    const infoResult = await this.sandboxFileInfo.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `File info for ${infoResult.data.name}: type=${infoResult.data.type}, size=${infoResult.data.size} bytes, permissions=${infoResult.data.permissions}, owner=${infoResult.data.owner}`,
    });
  }

  @Transition({ from: 'info_retrieved', to: 'file_deleted' })
  async deleteFile(state: SandboxExampleState) {
    const deleteResult = await this.sandboxDelete.call({
      containerId: state.containerId!,
      path: '/workspace/result.txt',
      recursive: false,
      force: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `File deleted: ${deleteResult.data.path} (deleted: ${deleteResult.data.deleted})`,
    });
  }

  @Transition({ from: 'file_deleted', to: 'end' })
  async destroySandbox(state: SandboxExampleState) {
    const destroyResult = await this.sandboxDestroy.call({
      containerId: state.containerId!,
      removeContainer: true,
    });

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Sandbox destroyed. Container ${destroyResult.data.containerId} removed=${destroyResult.data.removed}`,
    });
  }

  private formatEntries(entries: FileEntry[]): string {
    if (!entries || entries.length === 0) {
      return '(empty)';
    }
    return entries.map((e) => `${e.name} (${e.type}, ${e.size} bytes)`).join(', ');
  }
}
