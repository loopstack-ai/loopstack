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
import { InjectTool, Tool, ToolInterface, ToolResult, WithArguments, WorkflowExecution } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const propertiesSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to check for file existence'),
    path: z.string().describe('The path to check for existence'),
  })
  .strict();

type SandboxExistsArgs = z.infer<typeof propertiesSchema>;

interface SandboxExistsResult {
  path: string;
  exists: boolean;
  type: 'file' | 'directory' | 'symlink' | 'other' | null;
}

@Injectable()
@Tool({
  config: {
    description: 'Check if a file or directory exists in a sandbox container',
  },
})
@WithArguments(propertiesSchema)
export class SandboxExists implements ToolInterface<SandboxExistsArgs> {
  private readonly logger = new Logger(SandboxExists.name);

  @InjectTool()
  private sandboxCommand: SandboxCommand;

  async execute(args: SandboxExistsArgs, _ctx: WorkflowExecution): Promise<ToolResult<SandboxExistsResult>> {
    const { containerId, path: targetPath } = args;

    this.logger.debug(`Checking existence of ${targetPath} in container ${containerId}`);

    // Use test command to check existence and stat to get type
    const result = await this.sandboxCommand.execute({
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
