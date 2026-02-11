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
import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { DockerContainerManagerService } from '../services/docker-container-manager.service';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to destroy'),
    removeContainer: z
      .boolean()
      .default(true)
      .describe('Whether to remove the Docker container (true) or just stop it (false)'),
  })
  .strict();

type SandboxDestroyArgs = z.infer<typeof inputSchema>;

interface SandboxDestroyResult {
  containerId: string;
  removed: boolean;
}

@Tool({
  config: {
    description: 'Stop and destroy a sandbox container',
  },
})
export class SandboxDestroy implements ToolInterface<SandboxDestroyArgs> {
  private readonly logger = new Logger(SandboxDestroy.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  @Input({ schema: inputSchema })
  args: SandboxDestroyArgs;

  async execute(args: SandboxDestroyArgs): Promise<ToolResult<SandboxDestroyResult>> {
    const { containerId, removeContainer } = args;

    this.logger.debug(`Destroying sandbox ${containerId} (removeContainer: ${removeContainer})`);

    if (removeContainer) {
      await this.containerManager.removeContainer(containerId);
      this.logger.log(`Removed container ${containerId}`);
    } else {
      await this.containerManager.stopContainer(containerId);
      this.logger.log(`Stopped container ${containerId}`);
    }

    this.containerManager.unregisterContainer(containerId);

    return {
      data: {
        containerId,
        removed: removeContainer,
      },
    };
  }
}
