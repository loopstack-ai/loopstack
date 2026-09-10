import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretEntity } from '../../entities/index.js';
import { SecretService } from '../secret.service.js';

type SecretRepositoryMock = {
  find: Mock;
  findOne: Mock;
  create: Mock;
  save: Mock;
  remove: Mock;
};

const createRepositoryMock = (): SecretRepositoryMock => ({
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
});

describe('SecretService', () => {
  let repo: SecretRepositoryMock;
  let service: SecretService;

  const makeService = (globalSecretKeys?: string[]) =>
    new SecretService(repo as unknown as Repository<SecretEntity>, { globalSecretKeys });

  beforeEach(() => {
    repo = createRepositoryMock();
    service = makeService();
  });

  describe('findAllByWorkspace', () => {
    it('queries secrets scoped to workspace, ordered by key', async () => {
      const rows = [{ id: '1', workspaceId: 'ws-1', key: 'A', value: 'a' }];
      repo.find.mockResolvedValue(rows);

      const result = await service.findAllByWorkspace('ws-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1' },
        order: { key: 'ASC' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('create', () => {
    it('creates and saves a new secret', async () => {
      const draft = { workspaceId: 'ws-1', key: 'TOKEN', value: 'xyz' };
      const saved = { id: 's-1', ...draft };
      repo.create.mockReturnValue(draft);
      repo.save.mockResolvedValue(saved);

      const result = await service.create('ws-1', { key: 'TOKEN', value: 'xyz' });

      expect(repo.create).toHaveBeenCalledWith({ workspaceId: 'ws-1', key: 'TOKEN', value: 'xyz' });
      expect(repo.save).toHaveBeenCalledWith(draft);
      expect(result).toBe(saved);
    });
  });

  describe('update', () => {
    it('updates the value when the secret exists', async () => {
      const existing = { id: 's-1', workspaceId: 'ws-1', key: 'TOKEN', value: 'old' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity: SecretEntity) => Promise.resolve(entity));

      const result = await service.update('s-1', 'ws-1', { value: 'new' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 's-1', workspaceId: 'ws-1' } });
      expect(result.value).toBe('new');
    });

    it('throws NotFoundException when the secret does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update('missing', 'ws-1', { value: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('leaves value untouched when not provided', async () => {
      const existing = { id: 's-1', workspaceId: 'ws-1', key: 'TOKEN', value: 'old' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity: SecretEntity) => Promise.resolve(entity));

      const result = await service.update('s-1', 'ws-1', {});

      expect(result.value).toBe('old');
    });
  });

  describe('upsert', () => {
    it('updates when a secret with the same key already exists', async () => {
      const existing = { id: 's-1', workspaceId: 'ws-1', key: 'TOKEN', value: 'old' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity: SecretEntity) => Promise.resolve(entity));

      const result = await service.upsert('ws-1', { key: 'TOKEN', value: 'new' });

      expect(repo.create).not.toHaveBeenCalled();
      expect(result.value).toBe('new');
    });

    it('creates a new secret when the key is not present', async () => {
      repo.findOne.mockResolvedValue(null);
      const draft = { workspaceId: 'ws-1', key: 'TOKEN', value: 'new' };
      const saved = { id: 's-1', ...draft };
      repo.create.mockReturnValue(draft);
      repo.save.mockResolvedValue(saved);

      const result = await service.upsert('ws-1', { key: 'TOKEN', value: 'new' });

      expect(repo.create).toHaveBeenCalledWith(draft);
      expect(result).toBe(saved);
    });
  });

  describe('delete', () => {
    it('removes the secret when it exists', async () => {
      const existing = { id: 's-1', workspaceId: 'ws-1', key: 'TOKEN', value: 'v' };
      repo.findOne.mockResolvedValue(existing);

      await service.delete('s-1', 'ws-1');

      expect(repo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException when the secret does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.delete('missing', 'ws-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolveEnvMap', () => {
    it('overlays workspace secrets on the global allowlist (workspace wins)', async () => {
      service = makeService(['GLOBAL_ONLY', 'SHARED']);
      process.env.GLOBAL_ONLY = 'g1';
      process.env.SHARED = 'from-env';
      repo.find.mockResolvedValue([
        { key: 'SHARED', value: 'from-ws' },
        { key: 'WS_ONLY', value: 'w1' },
      ]);

      try {
        expect(await service.resolveEnvMap('ws-1')).toEqual({
          GLOBAL_ONLY: 'g1',
          SHARED: 'from-ws',
          WS_ONLY: 'w1',
        });
      } finally {
        delete process.env.GLOBAL_ONLY;
        delete process.env.SHARED;
      }
    });

    it('ignores allowlist keys absent from the environment, and needs no allowlist', async () => {
      delete process.env.MISSING;
      service = makeService(['MISSING']);
      repo.find.mockResolvedValue([{ key: 'WS_ONLY', value: 'w1' }]);
      expect(await service.resolveEnvMap('ws-1')).toEqual({ WS_ONLY: 'w1' });

      service = makeService(); // no allowlist configured → workspace-only
      expect(await service.resolveEnvMap('ws-1')).toEqual({ WS_ONLY: 'w1' });
    });
  });

  describe('resolveKeys', () => {
    it('flags global-only keys and marks workspace-overridden keys as non-global, sorted by key', async () => {
      service = makeService(['GLOBAL_ONLY', 'SHARED']);
      process.env.GLOBAL_ONLY = 'g';
      process.env.SHARED = 'g';
      repo.find.mockResolvedValue([
        { key: 'SHARED', value: 'w' },
        { key: 'WS_ONLY', value: 'w' },
      ]);

      try {
        expect(await service.resolveKeys('ws-1')).toEqual([
          { key: 'GLOBAL_ONLY', hasValue: true, global: true },
          { key: 'SHARED', hasValue: true, global: false },
          { key: 'WS_ONLY', hasValue: true, global: false },
        ]);
      } finally {
        delete process.env.GLOBAL_ONLY;
        delete process.env.SHARED;
      }
    });
  });
});
