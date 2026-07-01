import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to get file info from'),
    path: z.string().describe('The path to the file or directory'),
  })
  .strict();

/**
 * Args for `SandboxFileInfo`.
 *
 * Identifies the container and the path to inspect.
 *
 * @public
 */
export type SandboxFileInfoArgs = z.infer<typeof inputSchema>;

/**
 * Result of `SandboxFileInfo`.
 *
 * Detailed metadata for a path — type, size, permissions, owner/group, and timestamps.
 *
 * @public
 */
export interface SandboxFileInfoResult {
  path: string;
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifiedAt: string;
  accessedAt: string;
  createdAt: string;
}

/**
 * Tool that returns detailed metadata for a file or directory in a sandbox container — type, size,
 * permissions, owner/group, and timestamps.
 *
 * @providedBy SandboxFilesystemModule
 * @public
 */
@Tool({
  name: 'sandbox_file_info',
  description: 'Get detailed information about a file or directory in a sandbox container',
  schema: inputSchema,
})
export class SandboxFileInfo extends BaseTool<SandboxFileInfoArgs, object, SandboxFileInfoResult> {
  private readonly logger = new Logger(SandboxFileInfo.name);

  constructor(private readonly sandboxCommand: SandboxCommand) {
    super();
  }

  protected async handle(args: SandboxFileInfoArgs): Promise<ToolEnvelope<SandboxFileInfoResult>> {
    const { containerId, path: targetPath } = args;

    this.logger.debug(`Getting file info for ${targetPath} in container ${containerId}`);

    // Use stat to get detailed file information
    // Format: type|size|permissions|owner|group|mtime|atime|ctime
    const result = await this.sandboxCommand.call({
      containerId,
      executable: 'stat',
      args: ['-c', '%F|%s|%A|%U|%G|%y|%x|%w', targetPath],
      workingDirectory: '/',
      timeout: 10000,
    });

    if (!result.data) {
      this.logger.error(`Failed to get file info for ${targetPath}: No result data`);
      throw new Error(`Failed to get file info for ${targetPath}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to get file info for ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to get file info for ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
    }

    const output = result.data.stdout.trim();
    const parts = output.split('|');

    if (parts.length < 8) {
      this.logger.error(`Unexpected stat output format: ${output}`);
      throw new Error(`Unexpected stat output format: ${output}`);
    }

    const [typeStr, sizeStr, permissions, owner, group, mtime, atime, ctime] = parts;

    const name = targetPath.split('/').pop() || targetPath;
    const fileType = this.parseFileType(typeStr);

    this.logger.debug(`Retrieved info for ${targetPath}: type=${fileType}, size=${sizeStr}`);

    return {
      data: {
        path: targetPath,
        name,
        type: fileType,
        size: parseInt(sizeStr, 10),
        permissions,
        owner,
        group,
        modifiedAt: mtime,
        accessedAt: atime,
        createdAt: ctime === '-' ? mtime : ctime,
      },
    };
  }

  private parseFileType(typeStr: string): SandboxFileInfoResult['type'] {
    const lower = typeStr.toLowerCase();
    if (lower.includes('regular')) return 'file';
    if (lower.includes('directory')) return 'directory';
    if (lower.includes('symbolic link')) return 'symlink';
    return 'other';
  }
}
