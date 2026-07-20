import { describe, expect, it, vi } from 'vitest';
import { User, UserTypeEnum } from '@loopstack/common';
import { UserRepository } from './user.repository.js';

function createRepositoryMock(localUser: User | null) {
  return {
    findOne: vi.fn(async () => localUser),
    create: vi.fn((data: Partial<User>) => data as User),
    save: vi.fn(async (data: User) => data),
  };
}

describe('UserRepository.findOrCreateLocalUser', () => {
  it('returns the existing local user', async () => {
    const existing = { id: 'u1', type: UserTypeEnum.Local } as User;
    const typeorm = createRepositoryMock(existing);
    const repository = new UserRepository(typeorm as never);

    expect(await repository.findOrCreateLocalUser()).toBe(existing);
    expect(typeorm.save).not.toHaveBeenCalled();
  });

  it('creates a local user when none exists', async () => {
    const typeorm = createRepositoryMock(null);
    const repository = new UserRepository(typeorm as never);

    const user = await repository.findOrCreateLocalUser();

    expect(user).toMatchObject({ type: UserTypeEnum.Local, isActive: true, roles: [] });
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeorm.save).toHaveBeenCalledOnce();
  });
});
