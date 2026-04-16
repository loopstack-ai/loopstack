import { Controller, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, CurrentUserInterface, WorkspaceEntity } from '@loopstack/common';
import { RemoteClient } from '../services/remote-client.service';

@Controller('api/v1/workspaces')
export class EnvironmentController {
  private readonly logger = new Logger(EnvironmentController.name);

  constructor(
    private readonly remoteAgentClient: RemoteClient,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  @Post(':workspaceId/environments/:slotId/reset')
  async resetEnvironment(
    @Param('workspaceId') workspaceId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{ success: boolean; message: string }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, createdBy: user.userId },
      relations: ['environments'],
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    const environment = workspace.environments?.find((e) => e.slotId === slotId);
    if (!environment) {
      throw new NotFoundException(`Environment with slot ID ${slotId} not found`);
    }

    if (!environment.agentUrl) {
      throw new NotFoundException(`Environment ${slotId} has no agent URL configured`);
    }

    this.logger.log(`Resetting environment ${slotId} for workspace ${workspaceId} via ${environment.agentUrl}`);
    return this.remoteAgentClient.resetWorkspace(environment.agentUrl);
  }
}
