import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, CurrentUserInterface, ZodValidationPipe } from '@loopstack/common';
import { ClientMessageService, WorkspaceService } from '@loopstack/core';
import { SecretEntity } from '../entities/index.js';
import {
  SecretItemInterface,
  SecretUpdateInterface,
  SecretUpdateSchema,
  SecretWriteInterface,
  SecretWriteSchema,
} from '../schemas/secret-api.schemas.js';
import { SecretService } from '../services/index.js';

function toSecretItem(secret: SecretEntity): SecretItemInterface {
  return {
    id: secret.id,
    key: secret.key,
    hasValue: !!secret.value,
  };
}

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
  async getSecrets(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<SecretItemInterface[]> {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secrets = await this.secretService.findAllByWorkspace(workspaceId);
    return secrets.map(toSecretItem);
  }

  @Post()
  async createSecret(
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(SecretWriteSchema)) body: SecretWriteInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<SecretItemInterface> {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.create(workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return toSecretItem(secret);
  }

  @Put('upsert')
  async upsertSecret(
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(SecretWriteSchema)) body: SecretWriteInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<SecretItemInterface> {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.upsert(workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return toSecretItem(secret);
  }

  @Put(':id')
  async updateSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SecretUpdateSchema)) body: SecretUpdateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<SecretItemInterface> {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    const secret = await this.secretService.update(id, workspaceId, body);
    this.clientMessages.dispatchWorkspaceEvent('secret.upserted', workspaceId, user.userId);
    return toSecretItem(secret);
  }

  @Delete(':id')
  async deleteSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<{ success: boolean }> {
    await this.verifyWorkspaceAccess(workspaceId, user.userId);
    await this.secretService.delete(id, workspaceId);
    this.clientMessages.dispatchWorkspaceEvent('secret.deleted', workspaceId, user.userId);
    return { success: true };
  }
}
