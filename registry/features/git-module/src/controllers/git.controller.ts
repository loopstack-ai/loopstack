import { Controller, Delete, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/git')
export class GitController {
  constructor(
    private readonly remote: RemoteClient,
    private readonly env: EnvironmentService,
  ) {}

  @Get('status')
  async getStatus(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.gitStatus(agentUrl);
  }

  @Get('log')
  async getLog(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.remote.gitLog(agentUrl, parsedLimit);
  }

  @Get('remote')
  async getRemote(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.gitRemote(agentUrl);
  }

  @Get('branches')
  async getBranches(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.gitBranches(agentUrl);
  }

  @Delete('remote')
  async removeRemote(@Param('workspaceId') workspaceId: string, @CurrentUser() _user: CurrentUserInterface) {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.gitRemoveRemote(agentUrl);
  }
}
