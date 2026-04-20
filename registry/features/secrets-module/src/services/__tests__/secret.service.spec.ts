import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SecretEntity } from '../../entities';
import { SecretService } from '../secret.service';

type SecretRepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

const createRepositoryMock = (): SecretRepositoryMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('SecretService', () => {
  let repo: SecretRepositoryMock;
  let service: SecretService;

  beforeEach(() => {
    repo = createRepositoryMock();
    service = new SecretService(repo as unknown as Repository<SecretEntity>);
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
});
