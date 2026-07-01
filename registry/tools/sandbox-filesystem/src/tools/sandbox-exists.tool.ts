import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to check for file existence'),
    path: z.string().describe('The path to check for existence'),
  })
  .strict();

/**
 * Args for `SandboxExists`.
 *
 * Identifies the container and the path to check for existence.
 *
 * @public
 */
export type SandboxExistsArgs = z.infer<typeof inputSchema>;

/**
 * Result of `SandboxExists`.
 *
 * Reports whether the path exists and, if so, its type (or `null` when absent).
 *
 * @public
 */
export interface SandboxExistsResult {
  path: string;
  exists: boolean;
  type: 'file' | 'directory' | 'symlink' | 'other' | null;
}

/**
 * Tool that checks whether a path exists in a sandbox container and reports its type.
 *
 * @providedBy SandboxFilesystemModule
 * @public
 */
@Tool({
  name: 'sandbox_exists',
  description: 'Check if a file or directory exists in a sandbox container',
  schema: inputSchema,
})
export class SandboxExists extends BaseTool<SandboxExistsArgs, object, SandboxExistsResult> {
  private readonly logger = new Logger(SandboxExists.name);

  constructor(private readonly sandboxCommand: SandboxCommand) {
    super();
  }

  protected async handle(args: SandboxExistsArgs): Promise<ToolEnvelope<SandboxExistsResult>> {
    const { containerId, path: targetPath } = args;

    this.logger.debug(`Checking existence of ${targetPath} in container ${containerId}`);

    // Use test command to check existence and stat to get type
    const result = await this.sandboxCommand.call({
      containerId,
      executable: 'sh',
      args: [
        '-c',
        `if [ -e '${targetPath.replace(/'/g, "'\\''")}' ]; then stat -c '%F' '${targetPath.replace(/'/g, "'\\''")}'; else echo 'NOT_FOUND'; fi`,
      ],
      workingDirectory: '/',
      timeout: 10000,
    });

    if (!result.data) {
      this.logger.error(`Failed to check existence of ${targetPath}: No result data`);
      throw new Error(`Failed to check existence of ${targetPath}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to check existence of ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to check existence of ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
    }

    const output = result.data.stdout.trim();
    const exists = output !== 'NOT_FOUND';

    let type: SandboxExistsResult['type'] = null;
    if (exists) {
      type = this.parseFileType(output);
    }

    this.logger.debug(`Path ${targetPath} exists: ${exists}${exists ? `, type: ${type}` : ''}`);

    return {
      data: {
        path: targetPath,
        exists,
        type,
      },
    };
  }

  private parseFileType(statOutput: string): SandboxExistsResult['type'] {
    const lower = statOutput.toLowerCase();
    if (lower.includes('regular')) return 'file';
    if (lower.includes('directory')) return 'directory';
    if (lower.includes('symbolic link')) return 'symlink';
    return 'other';
  }
}
