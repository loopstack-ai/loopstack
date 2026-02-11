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
    containerId: z.string().describe('A unique identifier for this container instance'),
    imageName: z.string().describe("The Docker image to use (e.g., 'node:18', 'python:3.11')"),
    containerName: z.string().describe('The name for the Docker container'),
    projectOutPath: z.string().describe('The host path to mount into the container'),
    rootPath: z.string().default('workspace').describe('The path inside the container where projectOutPath is mounted'),
  })
  .strict();

type SandboxInitArgs = z.infer<typeof inputSchema>;

interface SandboxInitResult {
  containerId: string;
  dockerId: string;
}

@Tool({
  config: {
    description: 'Initialize a new sandbox container',
  },
})
export class SandboxInit implements ToolInterface<SandboxInitArgs> {
  private readonly logger = new Logger(SandboxInit.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  @Input({ schema: inputSchema })
  args: SandboxInitArgs;

  async execute(args: SandboxInitArgs): Promise<ToolResult<SandboxInitResult>> {
    const { containerId, imageName, containerName, projectOutPath, rootPath } = args;

    this.logger.debug(
      `Initializing sandbox ${containerId} with image ${imageName} (container: ${containerName}, mount: ${projectOutPath} -> /${rootPath})`,
    );

    this.containerManager.registerContainer(containerId, {
      imageName,
      containerName,
      projectOutPath,
      rootPath,
    });

    const container = await this.containerManager.ensureContainer(containerId);

    this.logger.log(`Sandbox ${containerId} initialized with Docker ID ${container.id}`);

    return {
      data: {
        containerId,
        dockerId: container.id,
      },
    };
  }
}
