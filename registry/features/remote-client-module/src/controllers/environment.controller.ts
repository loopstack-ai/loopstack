import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, CurrentUserInterface, WorkspaceEntity } from '@loopstack/common';
import { WorkspaceEnvironmentDto } from '../dtos/index.js';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces')
export class EnvironmentController {
  private readonly logger = new Logger(EnvironmentController.name);

  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  @Get(':workspaceId/environments')
  async getEnvironments(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceEnvironmentDto[]> {
    await this.assertWorkspaceOwnership(workspaceId, user.userId);
    const entities = await this.env.findByWorkspace(workspaceId);
    return entities.map(WorkspaceEnvironmentDto.create);
  }

  @Put(':workspaceId/environments')
  async replaceEnvironments(
    @Param('workspaceId') workspaceId: string,
    @Body() environments: WorkspaceEnvironmentDto[],
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<WorkspaceEnvironmentDto[]> {
    await this.assertWorkspaceOwnership(workspaceId, user.userId);
    const entities = await this.env.replaceAll(workspaceId, environments);
    return entities.map(WorkspaceEnvironmentDto.create);
  }

  @Post(':workspaceId/environments/:slotId/reset')
  async resetEnvironment(
    @Param('workspaceId') workspaceId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<{ success: boolean; message: string }> {
    let agentUrl: string;
    try {
      agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    } catch {
      throw new NotFoundException(`No environment with agent URL found for slot ${slotId} in workspace ${workspaceId}`);
    }

    this.logger.log(`Resetting environment ${slotId} for workspace ${workspaceId} via ${agentUrl}`);
    return this.remote.resetWorkspace(agentUrl);
  }

  private async assertWorkspaceOwnership(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, createdBy: userId },
      select: ['id'],
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }
  }
}
