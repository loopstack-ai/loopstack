import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { API_TOKEN_PREFIX, ApiTokenEntity, CurrentUserInterface } from '@loopstack/common';
import type { ApiTokenCreateInterface } from '@loopstack/contracts/api';

/** Skip the last-used write when the token was already seen recently. */
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class ApiTokenService {
  private readonly logger = new Logger(ApiTokenService.name);

  constructor(
    @InjectRepository(ApiTokenEntity)
    private readonly apiTokenRepository: Repository<ApiTokenEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a token for the user and returns the plaintext once — only the
   * sha256 hash is persisted.
   */
  async create(userId: string, payload: ApiTokenCreateInterface): Promise<{ entity: ApiTokenEntity; token: string }> {
    const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const expiresAt = payload.expiresInDays ? new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000) : null;

    const entity = await this.apiTokenRepository.save(
      this.apiTokenRepository.create({
        name: payload.name,
        tokenHash: hashToken(token),
        userId,
        expiresAt,
        lastUsedAt: null,
      }),
    );

    return { entity, token };
  }

  async list(userId: string): Promise<ApiTokenEntity[]> {
    return this.apiTokenRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async revoke(id: string, userId: string): Promise<void> {
    const result = await this.apiTokenRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException(`API token ${id} not found`);
    }
  }

  /**
   * Resolves a bearer credential to its owning user, or `null` when the token
   * is unknown, expired, or belongs to an inactive user.
   */
  async validate(token: string): Promise<CurrentUserInterface | null> {
    const entity = await this.apiTokenRepository.findOne({
      where: { tokenHash: hashToken(token) },
      relations: ['user', 'user.roles'],
    });

    if (!entity || !entity.user?.isActive) return null;
    if (entity.expiresAt && entity.expiresAt.getTime() < Date.now()) return null;

    if (!entity.lastUsedAt || Date.now() - entity.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
      this.apiTokenRepository
        .update(entity.id, { lastUsedAt: new Date() })
        .catch((error) => this.logger.warn(`Failed to update lastUsedAt for token ${entity.id}:`, error));
    }

    return {
      userId: entity.user.id,
      type: entity.user.type,
      workerId: this.configService.get<string>('auth.clientId')!,
      roles: entity.user.roles?.map((role) => role.name) ?? [],
    };
  }
}
