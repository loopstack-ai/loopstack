import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectTool, Tool, ToolResult } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to list the directory from'),
    path: z.string().describe('The path to the directory to list'),
    recursive: z.boolean().default(false).describe('Whether to list directories recursively'),
  })
  .strict();

type SandboxListDirectoryArgs = z.infer<typeof inputSchema>;

interface FileEntry {
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size: number;
  path: string;
}

interface SandboxListDirectoryResult {
  path: string;
  entries: FileEntry[];
}

@Tool({
  uiConfig: {
    description: 'List files and directories in a sandbox container',
  },
  schema: inputSchema,
})
export class SandboxListDirectory extends BaseTool {
  private readonly logger = new Logger(SandboxListDirectory.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  async call(args: SandboxListDirectoryArgs): Promise<ToolResult<SandboxListDirectoryResult>> {
    const { containerId, path: dirPath, recursive } = args;

    this.logger.debug(`Listing directory ${dirPath} in container ${containerId} (recursive: ${recursive})`);

    // Use find for recursive, ls for non-recursive
    // Output format: type size path
    const command = recursive
      ? `find '${dirPath.replace(/'/g, "'\\''")}' -printf '%y %s %p\\n'`
      : `find '${dirPath.replace(/'/g, "'\\''")}' -maxdepth 1 -printf '%y %s %p\\n'`;

    const result = await this.sandboxCommand.call({
      containerId,
      executable: 'sh',
      args: ['-c', command],
      workingDirectory: '/',
      timeout: 30000,
    });

    if (!result.data) {
      this.logger.error(`Failed to list directory ${dirPath}: No result data`);
      throw new Error(`Failed to list directory ${dirPath}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to list directory ${dirPath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to list directory ${dirPath}: ${result.data.stderr || 'Unknown error'}`);
    }

    const entries: FileEntry[] = [];
    const lines = result.data.stdout.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const match = line.match(/^(\S)\s+(\d+)\s+(.+)$/);
      if (match) {
        const [, typeChar, sizeStr, fullPath] = match;
        const name = fullPath.split('/').pop() || fullPath;

        // Skip the directory itself in non-recursive mode
        if (fullPath === dirPath) continue;

        entries.push({
          name,
          type: this.parseFileType(typeChar),
          size: parseInt(sizeStr, 10),
          path: fullPath,
        });
      }
    }

    this.logger.debug(`Listed ${entries.length} entries in ${dirPath}`);

    return {
      data: {
        path: dirPath,
        entries,
      },
    };
  }

  private parseFileType(typeChar: string): FileEntry['type'] {
    switch (typeChar) {
      case 'f':
        return 'file';
      case 'd':
        return 'directory';
      case 'l':
        return 'symlink';
      default:
        return 'other';
    }
  }
}
