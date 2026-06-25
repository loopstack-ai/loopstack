import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { ClientMessageService, WorkspaceService } from '@loopstack/core';
import { SecretService } from '../services/index.js';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/secrets')
export class SecretController {
  constructor(
    private readonly secretService: SecretService,
    private readonly workspaceService: WorkspaceService,
    private readonly clientMessages: ClientMessageService,
  ) {}

  private async verifyWorkspaceAccess(workspaceId: string, userId: string) {
    const workspace = await this.workspaceService.getWorkspace({ id: workspaceId }, userId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }
    return workspace;
  }

  @Get()
  async getSecrets(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secrets = await this.secretService.findAllByWorkspace(workspaceId);
    return secrets.map((s) => ({
      id: s.id,
      key: s.key,
      hasValue: !!s.value,
    }));
  }

  @Post()
  async createSecret(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { key: string; value: string },
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.create(workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return { id: secret.id, key: secret.key };
  }

  @Put('upsert')
  async upsertSecret(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { key: string; value: string },
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.upsert(workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return { id: secret.id, key: secret.key };
  }

  @Put(':id')
  async updateSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { value?: string },
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.update(id, workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return { id: secret.id, key: secret.key };
  }

  @Delete(':id')
  async deleteSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    await this.secretService.delete(id, workspaceId);
    this.clientMessages.dispatchWorkspaceEvent('secret.deleted', workspaceId, user.userId);
    return { success: true };
  }
}
