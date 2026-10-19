import { Controller, Delete, Get, Inject, Optional, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';
import { GIT_REPOSITORY_SOURCE, type GitRepository, type GitRepositorySource } from '../repositories/index.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/git')
export class GitController {
  constructor(
    private readonly remote: RemoteClient,
    private readonly env: EnvironmentService,
    @Optional() @Inject(GIT_REPOSITORY_SOURCE) private readonly repositories?: GitRepositorySource,
  ) {}

  /**
   * The repositories this workspace holds, as the application declared them — what a reader picks between
   * before asking for a status or a log. An application that declares none answers with an empty list, which
   * reads as "one repository, at the root".
   *
   * It needs no container: the list is what the workspace was created with, not what git reports.
   */
  @Get('repos')
  async getRepos(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<{ repos: GitRepository[] }> {
    const repos = (await this.repositories?.list(workspaceId)) ?? [];
    return { repos };
  }

  @Get('status')
  async getStatus(
    @Param('workspaceId') workspaceId: string,
    @Query('slotId') slotId: string | undefined,
    @Query('dir') dir: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    return this.remote.gitStatus(agentUrl, { dir });
  }

  @Get('log')
  async getLog(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit: string | undefined,
    @Query('slotId') slotId: string | undefined,
    @Query('dir') dir: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.remote.gitLog(agentUrl, { limit: parsedLimit, dir });
  }

  @Get('remote')
  async getRemote(
    @Param('workspaceId') workspaceId: string,
    @Query('slotId') slotId: string | undefined,
    @Query('dir') dir: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    return this.remote.gitRemote(agentUrl, { dir });
  }

  @Get('branches')
  async getBranches(
    @Param('workspaceId') workspaceId: string,
    @Query('slotId') slotId: string | undefined,
    @Query('dir') dir: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    return this.remote.gitBranches(agentUrl, { dir });
  }

  @Delete('remote')
  async removeRemote(
    @Param('workspaceId') workspaceId: string,
    @Query('slotId') slotId: string | undefined,
    @Query('dir') dir: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ) {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId, slotId);
    return this.remote.gitRemoveRemote(agentUrl, { dir });
  }
}
