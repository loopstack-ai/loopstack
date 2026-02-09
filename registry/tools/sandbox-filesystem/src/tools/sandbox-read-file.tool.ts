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
import { InjectTool, Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { SandboxCommand } from '@loopstack/sandbox-tool';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to read the file from'),
    path: z.string().describe('The path to the file to read'),
    encoding: z.enum(['utf8', 'base64']).default('utf8').describe('The encoding to use when reading the file'),
  })
  .strict();

type SandboxReadFileArgs = z.infer<typeof inputSchema>;

interface SandboxReadFileResult {
  content: string;
  encoding: string;
}

@Injectable()
@Tool({
  config: {
    description: 'Read file contents from a sandbox container',
  },
})
export class SandboxReadFile implements ToolInterface<SandboxReadFileArgs> {
  private readonly logger = new Logger(SandboxReadFile.name);

  @InjectTool() private sandboxCommand: SandboxCommand;

  @Input({ schema: inputSchema })
  args: SandboxReadFileArgs;

  async execute(args: SandboxReadFileArgs): Promise<ToolResult<SandboxReadFileResult>> {
    const { containerId, path, encoding } = args;

    this.logger.debug(`Reading file ${path} from container ${containerId} (encoding: ${encoding})`);

    const executable = encoding === 'base64' ? 'base64' : 'cat';
    const result = await this.sandboxCommand.execute({
      containerId,
      executable,
      args: [path],
      workingDirectory: '/',
      timeout: 30000,
    });

    if (!result.data) {
      this.logger.error(`Failed to read file ${path}: No result data`);
      throw new Error(`Failed to read file ${path}: No result data`);
    }

    if (result.data.exitCode !== 0) {
      this.logger.error(`Failed to read file ${path}: ${result.data.stderr || 'Unknown error'}`);
      throw new Error(`Failed to read file ${path}: ${result.data.stderr || 'Unknown error'}`);
    }

    this.logger.debug(`Successfully read file ${path} (${result.data.stdout.length} characters)`);

    return {
      data: {
        content: result.data.stdout,
        encoding,
      },
    };
  }
}
