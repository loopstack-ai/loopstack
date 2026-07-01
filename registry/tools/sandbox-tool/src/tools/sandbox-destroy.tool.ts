import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { DockerContainerManagerService } from '../services/docker-container-manager.service.js';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the container to destroy'),
    removeContainer: z
      .boolean()
      .default(true)
      .describe('Whether to remove the Docker container (true) or just stop it (false)'),
  })
  .strict();

/**
 * Args for `SandboxDestroy`.
 *
 * Identifies the container to destroy and whether to remove it or merely stop it.
 *
 * @public
 */
export type SandboxDestroyArgs = z.infer<typeof inputSchema>;

/**
 * Result of `SandboxDestroy`.
 *
 * Reports the affected container id and whether it was removed.
 *
 * @public
 */
export interface SandboxDestroyResult {
  containerId: string;
  removed: boolean;
}

/**
 * Tool that stops a sandbox container and optionally removes it, then unregisters its config.
 *
 * @providedBy SandboxToolModule
 * @public
 */
@Tool({
  name: 'sandbox_destroy',
  description: 'Stop and destroy a sandbox container',
  schema: inputSchema,
})
export class SandboxDestroy extends BaseTool<SandboxDestroyArgs, object, SandboxDestroyResult> {
  private readonly logger = new Logger(SandboxDestroy.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  protected async handle(args: SandboxDestroyArgs): Promise<ToolEnvelope<SandboxDestroyResult>> {
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
