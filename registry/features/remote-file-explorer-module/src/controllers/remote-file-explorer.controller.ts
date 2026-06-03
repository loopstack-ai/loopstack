import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/files')
export class RemoteFileExplorerController {
  constructor(
    private readonly remote: RemoteClient,
    private readonly env: EnvironmentService,
  ) {}

  @Get('tree')
  async getFileTree(
    @Param('workspaceId') workspaceId: string,
    @Query('path') basePath: string | undefined,
    @CurrentUser() _user: CurrentUserInterface,
  ): Promise<unknown> {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.getFileTree(agentUrl, basePath ?? './src');
  }

  @Get('read')
  async readFile(
    @Param('workspaceId') workspaceId: string,
    @Query('path') filePath: string,
    @CurrentUser() _user: CurrentUserInterface,
  ) {
    const agentUrl = await this.env.getAgentUrlForWorkspace(workspaceId);
    return this.remote.readFile(agentUrl, filePath);
  }
}
