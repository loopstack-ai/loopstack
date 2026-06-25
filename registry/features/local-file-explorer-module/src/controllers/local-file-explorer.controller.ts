import { Controller, Get, NotFoundException, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { WorkspaceService } from '@loopstack/core';
import type { FileContentDto } from '../dtos/file-content.dto.js';
import type { FileExplorerNodeDto } from '../dtos/file-explorer-node.dto.js';
import { FileApiService } from '../services/file-api.service.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/local-files')
export class LocalFileExplorerController {
  constructor(
    private readonly fileApiService: FileApiService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  private async getWorkspaceAppName(workspaceId: string, userId: string): Promise<string> {
    const workspace = await this.workspaceService.getWorkspace({ id: workspaceId }, userId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }
    return workspace.appName;
  }

  @Get('tree')
  async getFileTree(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileExplorerNodeDto[]> {
    const appName = await this.getWorkspaceAppName(workspaceId, user.userId);
    return this.fileApiService.getFileTree(appName);
  }

  @Get('read')
  async readFile(
    @Param('workspaceId') workspaceId: string,
    @Query('path') filePath: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileContentDto> {
    const appName = await this.getWorkspaceAppName(workspaceId, user.userId);
    return this.fileApiService.getFileContent(appName, filePath);
  }
}
