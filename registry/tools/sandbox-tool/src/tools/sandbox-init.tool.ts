import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
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
  uiConfig: {
    description: 'Initialize a new sandbox container',
  },
  schema: inputSchema,
})
export class SandboxInit extends BaseTool {
  private readonly logger = new Logger(SandboxInit.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  async call(args: SandboxInitArgs): Promise<ToolResult<SandboxInitResult>> {
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
