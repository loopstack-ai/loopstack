import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
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
  uiConfig: {
    description: 'Stop and destroy a sandbox container',
  },
  schema: inputSchema,
})
export class SandboxDestroy extends BaseTool {
  private readonly logger = new Logger(SandboxDestroy.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  async call(args: SandboxDestroyArgs): Promise<ToolResult<SandboxDestroyResult>> {
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
