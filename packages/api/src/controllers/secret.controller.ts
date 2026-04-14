import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserInterface } from '@loopstack/common';
import { SecretService } from '@loopstack/core';
import { WorkspaceApiService } from '../services/workspace-api.service';

@ApiTags('api/v1/workspaces/:workspaceId/secrets')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/secrets')
export class SecretController {
  constructor(
    private readonly secretService: SecretService,
    private readonly workspaceApiService: WorkspaceApiService,
  ) {}

  @Get()
  async getSecrets(@Param('workspaceId') workspaceId: string, @CurrentUser() user: CurrentUserInterface) {
    await this.workspaceApiService.findOneById(workspaceId, user.userId);
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
    await this.workspaceApiService.findOneById(workspaceId, user.userId);
    const secret = await this.secretService.create(workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Put('upsert')
  async upsertSecret(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { key: string; value: string },
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.workspaceApiService.findOneById(workspaceId, user.userId);
    const secret = await this.secretService.upsert(workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Put(':id')
  async updateSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { value?: string },
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.workspaceApiService.findOneById(workspaceId, user.userId);
    const secret = await this.secretService.update(id, workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Delete(':id')
  async deleteSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserInterface,
  ) {
    await this.workspaceApiService.findOneById(workspaceId, user.userId);
    await this.secretService.delete(id, workspaceId);
    return { success: true };
  }
}
