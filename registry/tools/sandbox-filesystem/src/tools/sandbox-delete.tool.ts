import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to delete the file/directory from'),
    path: z.string().describe('The path to the file or directory to delete'),
    recursive: z.boolean().default(false).describe('Whether to recursively delete directories and their contents'),
    force: z.boolean().default(false).describe('Whether to force deletion without prompting for confirmation'),
  })
  .strict();

/**
 * Args for `SandboxDelete`.
 *
 * Identifies the container and target path, with optional recursive and force flags.
 *
 * @public
 */
export type SandboxDeleteArgs = z.infer<typeof inputSchema>;

/**
 * Result of `SandboxDelete`.
 *
 * Reports the target path and whether it was deleted.
 *
 * @public
 */
export interface SandboxDeleteResult {
  path: string;
  deleted: boolean;
}

/**
 * Tool that deletes a file or directory in a sandbox container, with optional recursive and force flags.
 *
 * @providedBy SandboxFilesystemModule
 * @public
 */
@Tool({
  name: 'sandbox_delete',
  description: 'Delete a file or directory in a sandbox container',
  schema: inputSchema,
})
export class SandboxDelete extends BaseTool<SandboxDeleteArgs, object, SandboxDeleteResult> {
  private readonly logger = new Logger(SandboxDelete.name);

  constructor(private readonly sandboxCommand: SandboxCommand) {
    super();
  }

  protected async handle(args: SandboxDeleteArgs): Promise<ToolEnvelope<SandboxDeleteResult>> {
    const { containerId, path: targetPath, recursive, force } = args;

    this.logger.debug(`Deleting ${targetPath} in container ${containerId} (recursive: ${recursive}, force: ${force})`);

    const rmArgs: string[] = [];
    if (recursive) rmArgs.push('-r');
    if (force) rmArgs.push('-f');
    rmArgs.push(targetPath);

    const result = await this.sandboxCommand.call({
      containerId,
      executable: 'rm',
      args: rmArgs,
      workingDirectory: '/',
      timeout: 30000,
    });

    if (!result.data) {
      this.logger.error(`Failed to delete ${targetPath}: No result data`);
      throw new Error(`Failed to delete ${targetPath}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to delete ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to delete ${targetPath}: ${result.data.stderr || 'Unknown error'}`);
    }

    this.logger.log(`Successfully deleted ${targetPath} in container ${containerId}`);

    return {
      data: {
        path: targetPath,
        deleted: true,
      },
    };
  }
}
