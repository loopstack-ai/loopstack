import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SecretService } from '@loopstack/core';

@ApiTags('api/v1/workspaces/:workspaceId/secrets')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('api/v1/workspaces/:workspaceId/secrets')
export class SecretController {
  constructor(private readonly secretService: SecretService) {}

  @Get()
  async getSecrets(@Param('workspaceId') workspaceId: string) {
    const secrets = await this.secretService.findAllByWorkspace(workspaceId);
    return secrets.map((s) => ({
      id: s.id,
      key: s.key,
      hasValue: !!s.value,
    }));
  }

  @Post()
  async createSecret(@Param('workspaceId') workspaceId: string, @Body() body: { key: string; value: string }) {
    const secret = await this.secretService.create(workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Put('upsert')
  async upsertSecret(@Param('workspaceId') workspaceId: string, @Body() body: { key: string; value: string }) {
    const secret = await this.secretService.upsert(workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Put(':id')
  async updateSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { value?: string },
  ) {
    const secret = await this.secretService.update(id, workspaceId, body);
    return { id: secret.id, key: secret.key };
  }

  @Delete(':id')
  async deleteSecret(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    await this.secretService.delete(id, workspaceId);
    return { success: true };
  }
}
