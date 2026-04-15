import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectTool, Tool, ToolResult } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to create the directory in'),
    path: z.string().describe('The path of the directory to create'),
    recursive: z.boolean().default(true).describe("Whether to create parent directories if they don't exist"),
  })
  .strict();

type SandboxCreateDirectoryArgs = z.infer<typeof inputSchema>;

interface SandboxCreateDirectoryResult {
  path: string;
  created: boolean;
}

@Tool({
  uiConfig: {
    description: 'Create a directory in a sandbox container',
  },
  schema: inputSchema,
})
export class SandboxCreateDirectory extends BaseTool {
  private readonly logger = new Logger(SandboxCreateDirectory.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  async call(args: SandboxCreateDirectoryArgs): Promise<ToolResult<SandboxCreateDirectoryResult>> {
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
