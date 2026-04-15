import { Controller, Get, NotFoundException, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { WorkspaceService } from '@loopstack/core';
import type { FileContentDto } from '../dtos/file-content.dto';
import type { FileExplorerNodeDto } from '../dtos/file-explorer-node.dto';
import { FileApiService } from '../services/file-api.service';

@ApiTags('api/v1/workspaces/:workspaceId/files')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/files')
export class LocalFileExplorerController {
  constructor(
    private readonly fileApiService: FileApiService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  private async getWorkspaceClassName(workspaceId: string, userId: string): Promise<string> {
    const workspace = await this.workspaceService.getWorkspace({ id: workspaceId }, userId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }
    return workspace.className;
  }

  @Get('tree')
  async getFileTree(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileExplorerNodeDto[]> {
    const className = await this.getWorkspaceClassName(workspaceId, user.userId);
    return this.fileApiService.getFileTree(className);
  }

  @Get('read')
  async readFile(
    @Param('workspaceId') workspaceId: string,
    @Query('path') filePath: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<FileContentDto> {
    const className = await this.getWorkspaceClassName(workspaceId, user.userId);
    return this.fileApiService.getFileContent(className, filePath);
  }
}
