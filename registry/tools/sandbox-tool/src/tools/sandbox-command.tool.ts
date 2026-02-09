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
import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { CommandExecutionResult, DockerContainerManagerService } from '../services/docker-container-manager.service';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the registered container to execute the command in'),
    executable: z.string().describe("The executable to run (e.g., 'npm', 'node', 'python')"),
    args: z.array(z.string()).optional().describe('Arguments to pass to the executable'),
    workingDirectory: z.string().default('/').describe('The working directory for command execution'),
    envVars: z.array(z.string()).optional().describe('Environment variables in KEY=VALUE format'),
    timeout: z.number().default(30000).describe('Timeout in milliseconds for the command execution'),
  })
  .strict();

type SandboxCommandArgs = z.infer<typeof inputSchema>;

@Injectable()
@Tool({
  config: {
    description: 'Execute a command in the sandbox environment',
  },
})
export class SandboxCommand implements ToolInterface<SandboxCommandArgs> {
  private readonly logger = new Logger(SandboxCommand.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  @Input({ schema: inputSchema })
  args: SandboxCommandArgs;

  async execute(args: SandboxCommandArgs): Promise<ToolResult<CommandExecutionResult>> {
    const argsStr = args.args?.length ? ` ${args.args.join(' ')}` : '';
    this.logger.debug(
      `Executing command: ${args.executable}${argsStr} in container ${args.containerId} (workDir: ${args.workingDirectory})`,
    );

    const result = await this.containerManager.executeCommand({
      containerId: args.containerId,
      executable: args.executable,
      args: args.args,
      workingDirectory: args.workingDirectory,
      envVars: args.envVars,
      timeout: args.timeout,
    });

    if (result.timedOut) {
      this.logger.warn(`Command timed out after ${args.timeout}ms: ${args.executable}${argsStr}`);
    } else if (result.exitCode !== 0) {
      this.logger.debug(`Command exited with code ${result.exitCode}: ${args.executable}${argsStr}`);
    } else {
      this.logger.debug(`Command completed successfully: ${args.executable}${argsStr}`);
    }

    return { data: result };
  }
}
