import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTokenEntity, CurrentUser, CurrentUserInterface, ZodValidationPipe } from '@loopstack/common';
import { ApiTokenCreateSchema } from '@loopstack/contracts/api';
import type { ApiTokenCreateInterface, ApiTokenCreatedInterface, ApiTokenInterface } from '@loopstack/contracts/api';
import { ApiTokenService } from '../services/api-token.service.js';

function toApiToken(entity: ApiTokenEntity): ApiTokenInterface {
  return {
    id: entity.id,
    name: entity.name,
    createdAt: entity.createdAt.toISOString(),
    lastUsedAt: entity.lastUsedAt?.toISOString() ?? null,
    expiresAt: entity.expiresAt?.toISOString() ?? null,
  };
}

@Controller('api/v1/auth/tokens')
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  /**
   * Creates a personal access token. The response contains the plaintext
   * token exactly once — it cannot be retrieved again.
   */
  @Post()
  async create(
    @Body(new ZodValidationPipe(ApiTokenCreateSchema)) payload: ApiTokenCreateInterface,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<ApiTokenCreatedInterface> {
    const { entity, token } = await this.apiTokenService.create(user.userId, payload);
    return { ...toApiToken(entity), token };
  }

  /**
   * Lists the user's tokens (never their secrets).
   */
  @Get()
  async list(@CurrentUser() user: CurrentUserInterface): Promise<ApiTokenInterface[]> {
    const tokens = await this.apiTokenService.list(user.userId);
    return tokens.map(toApiToken);
  }

  /**
   * Revokes a token.
   */
  @Delete(':id')
  async revoke(@Param('id') id: string, @CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.apiTokenService.revoke(id, user.userId);
  }
}
