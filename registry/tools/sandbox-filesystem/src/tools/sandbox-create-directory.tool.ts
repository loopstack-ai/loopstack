import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to create the directory in'),
    path: z.string().describe('The path of the directory to create'),
    recursive: z.boolean().default(true).describe("Whether to create parent directories if they don't exist"),
  })
  .strict();

/**
 * Args for `SandboxCreateDirectory`.
 *
 * Identifies the container and target directory path, with an optional recursive flag.
 *
 * @public
 */
export type SandboxCreateDirectoryArgs = z.infer<typeof inputSchema>;

/**
 * Result of `SandboxCreateDirectory`.
 *
 * Reports the directory path and whether it was created.
 *
 * @public
 */
export interface SandboxCreateDirectoryResult {
  path: string;
  created: boolean;
}

/**
 * Tool that creates a directory in a sandbox container, optionally creating parent directories.
 *
 * @providedBy SandboxFilesystemModule
 * @public
 */
@Tool({
  name: 'sandbox_create_directory',
  description: 'Create a directory in a sandbox container',
  schema: inputSchema,
})
export class SandboxCreateDirectory extends BaseTool<SandboxCreateDirectoryArgs, object, SandboxCreateDirectoryResult> {
  private readonly logger = new Logger(SandboxCreateDirectory.name);

  constructor(private readonly sandboxCommand: SandboxCommand) {
    super();
  }

  protected async handle(args: SandboxCreateDirectoryArgs): Promise<ToolEnvelope<SandboxCreateDirectoryResult>> {
    const { containerId, path: dirPath, recursive } = args;

    this.logger.debug(`Creating directory ${dirPath} in container ${containerId} (recursive: ${recursive})`);

    const mkdirArgs = recursive ? ['-p', dirPath] : [dirPath];

    const result = await this.sandboxCommand.call({
      containerId,
      executable: 'mkdir',
      args: mkdirArgs,
      workingDirectory: '/',
      timeout: 10000,
    });

    if (!result.data) {
      this.logger.error(`Failed to create directory ${dirPath}: No result data`);
      throw new Error(`Failed to create directory ${dirPath}: No result data`);
    }

    // Exit code 0 means success, exit code 1 with "File exists" is okay if directory already exists
    const alreadyExists = result.data.exitCode !== 0 && result.data.stderr.includes('File exists');

    if (result.data.exitCode !== 0 && !alreadyExists) {
      this.logger.error(`Failed to create directory ${dirPath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to create directory ${dirPath}: ${result.data.stderr || 'Unknown error'}`);
    }

    if (alreadyExists) {
      this.logger.debug(`Directory ${dirPath} already exists`);
    } else {
      this.logger.log(`Successfully created directory ${dirPath} in container ${containerId}`);
    }

    return {
      data: {
        path: dirPath,
        created: result.data.exitCode === 0,
      },
    };
  }
}
