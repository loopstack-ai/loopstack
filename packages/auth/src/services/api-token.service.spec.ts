import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiTokenEntity, UserTypeEnum } from '@loopstack/common';
import { ApiTokenService } from './api-token.service.js';

function createRepositoryMock() {
  return {
    create: vi.fn((data: Partial<ApiTokenEntity>) => data),
    save: vi.fn(async (data: Partial<ApiTokenEntity>) => ({ ...data, id: 'tok-1', createdAt: new Date() })),
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null as ApiTokenEntity | null),
    delete: vi.fn(async () => ({ affected: 1 })),
    update: vi.fn(async () => ({})),
  };
}

const configService = { get: vi.fn(() => 'worker-1') } as unknown as ConfigService;

function tokenEntity(overrides: Partial<ApiTokenEntity> = {}): ApiTokenEntity {
  return {
    id: 'tok-1',
    name: 'ci',
    tokenHash: 'hash',
    userId: 'user-1',
    user: {
      id: 'user-1',
      type: UserTypeEnum.Local,
      isActive: true,
      roles: [{ id: 'r1', name: 'ADMIN', description: '', users: [] }],
    },
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    ...overrides,
  } as ApiTokenEntity;
}

describe('ApiTokenService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: ApiTokenService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new ApiTokenService(repository as never, configService);
  });

  it('creates lsk_-prefixed tokens and persists only the hash', async () => {
    const { entity, token } = await service.create('user-1', { name: 'ci' });

    expect(token).toMatch(/^lsk_[A-Za-z0-9_-]{43}$/);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(saved.tokenHash).not.toContain(token);
    expect(saved.expiresAt).toBeNull();
    expect(entity.id).toBe('tok-1');
  });

  it('derives expiresAt from expiresInDays', async () => {
    await service.create('user-1', { name: 'ci', expiresInDays: 30 });
    const saved = repository.save.mock.calls[0][0];
    const expectedMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs((saved.expiresAt as Date).getTime() - expectedMs)).toBeLessThan(5000);
  });

  it('validate resolves the owning user with roles and workerId', async () => {
    repository.findOne.mockResolvedValue(tokenEntity());

    const user = await service.validate('lsk_valid');
    expect(user).toEqual({ userId: 'user-1', type: UserTypeEnum.Local, workerId: 'worker-1', roles: ['ADMIN'] });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { tokenHash: createHash('sha256').update('lsk_valid').digest('hex') },
      relations: ['user', 'user.roles'],
    });
  });

  it('validate rejects unknown, expired, and inactive-user tokens', async () => {
    expect(await service.validate('lsk_unknown')).toBeNull();

    repository.findOne.mockResolvedValue(tokenEntity({ expiresAt: new Date(Date.now() - 1000) }));
    expect(await service.validate('lsk_expired')).toBeNull();

    const inactive = tokenEntity();
    inactive.user.isActive = false;
    repository.findOne.mockResolvedValue(inactive);
    expect(await service.validate('lsk_inactive')).toBeNull();
  });

  it('throttles lastUsedAt writes', async () => {
    repository.findOne.mockResolvedValue(tokenEntity({ lastUsedAt: new Date() }));
    await service.validate('lsk_recent');
    expect(repository.update).not.toHaveBeenCalled();

    repository.findOne.mockResolvedValue(tokenEntity({ lastUsedAt: new Date(Date.now() - 120_000) }));
    await service.validate('lsk_stale');
    expect(repository.update).toHaveBeenCalledOnce();
  });

  it('revoke throws NotFound for foreign or missing tokens', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });
    await expect(service.revoke('tok-x', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.delete).toHaveBeenCalledWith({ id: 'tok-x', userId: 'user-1' });
  });
});
