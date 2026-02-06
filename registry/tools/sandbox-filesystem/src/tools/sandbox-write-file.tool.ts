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
import * as path from 'path';
import { z } from 'zod';
import { InjectTool, Tool, ToolInterface, ToolResult, WithArguments, WorkflowExecution } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const propertiesSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to write the file to'),
    path: z.string().describe('The path where the file should be written'),
    content: z.string().describe('The content to write to the file'),
    encoding: z.enum(['utf8', 'base64']).default('utf8').describe('The encoding of the content'),
    createParentDirs: z.boolean().default(true).describe("Whether to create parent directories if they don't exist"),
  })
  .strict();

type SandboxWriteFileArgs = z.infer<typeof propertiesSchema>;

interface SandboxWriteFileResult {
  path: string;
  bytesWritten: number;
}

@Injectable()
@Tool({
  config: {
    description: 'Write content to a file in a sandbox container',
  },
})
@WithArguments(propertiesSchema)
export class SandboxWriteFile implements ToolInterface<SandboxWriteFileArgs> {
  private readonly logger = new Logger(SandboxWriteFile.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  async execute(args: SandboxWriteFileArgs, _ctx: WorkflowExecution): Promise<ToolResult<SandboxWriteFileResult>> {
    const { containerId, path: filePath, content, encoding, createParentDirs } = args;

    this.logger.debug(`Writing file ${filePath} to container ${containerId} (encoding: ${encoding})`);

    // Create parent directories if needed
    if (createParentDirs) {
      const parentDir = path.posix.dirname(filePath);
      if (parentDir !== '/' && parentDir !== '.') {
        this.logger.debug(`Creating parent directory ${parentDir}`);
        const mkdirResult = await this.sandboxCommand.execute({
          containerId,
          executable: 'mkdir',
          args: ['-p', parentDir],
          workingDirectory: '/',
          timeout: 5000,
        });

        if (!mkdirResult.data) {
          this.logger.error(`Failed to create parent directory ${parentDir}: No result data`);
          throw new Error(`Failed to create parent directory ${parentDir}: No result data`);
        }

        if (mkdirResult.data.exitCode !== 0) {
          this.logger.error(
            `Failed to create parent directory ${parentDir}: ${mkdirResult.data.stderr || 'Unknown error'}`,
          );
          throw new Error(
            `Failed to create parent directory ${parentDir}: ${mkdirResult.data.stderr || 'Unknown error'}`,
          );
        }
      }
    }

    // Encode content as base64 for safe transfer
    const base64Content =
      encoding === 'utf8' ? Buffer.from(content, 'utf8').toString('base64') : content.replace(/[^A-Za-z0-9+/=]/g, '');

    // Write file using base64 decode
    const result = await this.sandboxCommand.execute({
      containerId,
      executable: 'sh',
      args: ['-c', `echo '${base64Content}' | base64 -d > '${filePath.replace(/'/g, "'\\''")}'`],
      workingDirectory: '/',
      timeout: 30000,
    });

    if (!result.data) {
      this.logger.error(`Failed to write file ${filePath}: No result data`);
      throw new Error(`Failed to write file ${filePath}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to write file ${filePath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to write file ${filePath}: ${result.data.stderr || 'Unknown error'}`);
    }

    const bytesWritten =
      encoding === 'utf8' ? Buffer.from(content, 'utf8').length : Buffer.from(content, 'base64').length;

    this.logger.log(`Successfully wrote ${bytesWritten} bytes to ${filePath} in container ${containerId}`);

    return {
      data: {
        path: filePath,
        bytesWritten,
      },
    };
  }
}
