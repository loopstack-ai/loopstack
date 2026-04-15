import { Controller, Get, NotFoundException, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, CurrentUserInterface, WorkspaceEntity } from '@loopstack/common';
import { RemoteAgentClient } from '@loopstack/remote-agent-client';

@ApiTags('api/v1/workspaces/:workspaceId/files')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/files')
export class RemoteFileExplorerController {
  constructor(
    private readonly remoteAgentClient: RemoteAgentClient,
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

  @Get('tree')
  async getFileTree(
    @Param('workspaceId') workspaceId: string,
    @Query('path') basePath: string | undefined,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.getFileTree(agentUrl, basePath ?? './src');
  }

  @Get('read')
  async readFile(
    @Param('workspaceId') workspaceId: string,
    @Query('path') filePath: string,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    const agentUrl = await this.getAgentUrl(workspaceId, user.userId);
    return this.remoteAgentClient.readFile(agentUrl, filePath);
  }
}
