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
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { InjectTool, Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
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

@Injectable()
@Tool({
  config: {
    description: 'List files and directories in a sandbox container',
  },
})
export class SandboxListDirectory implements ToolInterface<SandboxListDirectoryArgs> {
  private readonly logger = new Logger(SandboxListDirectory.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  @Input({ schema: inputSchema })
  args: SandboxListDirectoryArgs;

  async execute(args: SandboxListDirectoryArgs): Promise<ToolResult<SandboxListDirectoryResult>> {
    const { containerId, path: dirPath, recursive } = args;

    this.logger.debug(`Listing directory ${dirPath} in container ${containerId} (recursive: ${recursive})`);

    // Use find for recursive, ls for non-recursive
    // Output format: type size path
    const command = recursive
      ? `find '${dirPath.replace(/'/g, "'\\''")}' -printf '%y %s %p\\n'`
      : `find '${dirPath.replace(/'/g, "'\\''")}' -maxdepth 1 -printf '%y %s %p\\n'`;

    const result = await this.sandboxCommand.execute({
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
