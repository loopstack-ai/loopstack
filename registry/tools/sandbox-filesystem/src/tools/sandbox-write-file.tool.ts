import { Logger } from '@nestjs/common';
import * as path from 'path';
import { z } from 'zod';
import { BaseTool, InjectTool, Tool, ToolResult } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to write the file to'),
    path: z.string().describe('The path where the file should be written'),
    content: z.string().describe('The content to write to the file'),
    encoding: z.enum(['utf8', 'base64']).default('utf8').describe('The encoding of the content'),
    createParentDirs: z.boolean().default(true).describe("Whether to create parent directories if they don't exist"),
  })
  .strict();

type SandboxWriteFileArgs = z.infer<typeof inputSchema>;

interface SandboxWriteFileResult {
  path: string;
  bytesWritten: number;
}

@Tool({
  uiConfig: {
    description: 'Write content to a file in a sandbox container',
  },
  schema: inputSchema,
})
export class SandboxWriteFile extends BaseTool {
  private readonly logger = new Logger(SandboxWriteFile.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  async call(args: SandboxWriteFileArgs): Promise<ToolResult<SandboxWriteFileResult>> {
    const { containerId, path: filePath, content, encoding, createParentDirs } = args;

    this.logger.debug(`Writing file ${filePath} to container ${containerId} (encoding: ${encoding})`);

    // Create parent directories if needed
    if (createParentDirs) {
      const parentDir = path.posix.dirname(filePath);
      if (parentDir !== '/' && parentDir !== '.') {
        this.logger.debug(`Creating parent directory ${parentDir}`);
        const mkdirResult = await this.sandboxCommand.call({
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
    const result = await this.sandboxCommand.call({
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
