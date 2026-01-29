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
import { BlockConfig, Tool, ToolResult, WithArguments } from '@loopstack/common';
import { ToolBase, WorkflowExecution } from '@loopstack/core';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const propertiesSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to delete the file/directory from'),
    path: z.string().describe('The path to the file or directory to delete'),
    recursive: z.boolean().default(false).describe('Whether to recursively delete directories and their contents'),
    force: z.boolean().default(false).describe('Whether to force deletion without prompting for confirmation'),
  })
  .strict();

type SandboxDeleteArgs = z.infer<typeof propertiesSchema>;

interface SandboxDeleteResult {
  path: string;
  deleted: boolean;
}

@Injectable()
@BlockConfig({
  config: {
    description: 'Delete a file or directory in a sandbox container',
  },
})
@WithArguments(propertiesSchema)
export class SandboxDelete extends ToolBase<SandboxDeleteArgs> {
  private readonly logger = new Logger(SandboxDelete.name);

  @Tool() private sandboxCommand: SandboxCommand;

  async execute(args: SandboxDeleteArgs, _ctx: WorkflowExecution): Promise<ToolResult<SandboxDeleteResult>> {
    const { containerId, path: targetPath, recursive, force } = args;

    this.logger.debug(`Deleting ${targetPath} in container ${containerId} (recursive: ${recursive}, force: ${force})`);

    const rmArgs: string[] = [];
    if (recursive) rmArgs.push('-r');
    if (force) rmArgs.push('-f');
    rmArgs.push(targetPath);

    const result = await this.sandboxCommand.execute({
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
