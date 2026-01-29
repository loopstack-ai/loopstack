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
    containerId: z.string().describe('The ID of the container to create the directory in'),
    path: z.string().describe('The path of the directory to create'),
    recursive: z.boolean().default(true).describe("Whether to create parent directories if they don't exist"),
  })
  .strict();

type SandboxCreateDirectoryArgs = z.infer<typeof propertiesSchema>;

interface SandboxCreateDirectoryResult {
  path: string;
  created: boolean;
}

@Injectable()
@BlockConfig({
  config: {
    description: 'Create a directory in a sandbox container',
  },
})
@WithArguments(propertiesSchema)
export class SandboxCreateDirectory extends ToolBase<SandboxCreateDirectoryArgs> {
  private readonly logger = new Logger(SandboxCreateDirectory.name);

  @Tool() private sandboxCommand: SandboxCommand;

  async execute(
    args: SandboxCreateDirectoryArgs,
    _ctx: WorkflowExecution,
  ): Promise<ToolResult<SandboxCreateDirectoryResult>> {
    const { containerId, path: dirPath, recursive } = args;

    this.logger.debug(`Creating directory ${dirPath} in container ${containerId} (recursive: ${recursive})`);

    const mkdirArgs = recursive ? ['-p', dirPath] : [dirPath];

    const result = await this.sandboxCommand.execute({
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
