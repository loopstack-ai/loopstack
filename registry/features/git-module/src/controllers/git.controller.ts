import { Controller, Delete, Get, NotFoundException, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, CurrentUserInterface, WorkspaceEntity } from '@loopstack/common';
import { RemoteClient } from '@loopstack/remote-client';

@ApiTags('api/v1/workspaces/:workspaceId/git')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/git')
export class GitController {
  constructor(
    private readonly remoteAgentClient: RemoteClient,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  private async getAgentUrl(workspaceId: string, userId: string): Promise<string> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, createdBy: userId },
      relations: ['environments'],
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    const environment = workspace.environments?.find((e) => !!e.agentUrl);
    if (!environment?.agentUrl) {
      throw new NotFoundException(`No remote environment configured for workspace ${workspaceId}`);
    }

    return environment.agentUrl;
  }

  @Get('status')
  async getStatus(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.gitStatus(agentUrl);
  }

  @Get('log')
  async getLog(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.remoteAgentClient.gitLog(agentUrl, parsedLimit);
  }

  @Get('remote')
  async getRemote(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.gitRemote(agentUrl);
  }

  @Get('branches')
  async getBranches(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.gitBranches(agentUrl);
  }

  @Delete('remote')
  async removeRemote(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.gitRemoveRemote(agentUrl);
  }
}
