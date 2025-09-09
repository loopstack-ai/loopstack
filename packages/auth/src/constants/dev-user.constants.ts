import { UserResponseDto } from '@loopstack/shared';

export const DEV_USER_ROLES = [];

export const DEV_USER_CONFIG = {
  id: null,
  email: 'dev@localhost',
  firstName: 'Dev',
  lastName: 'User',
  isActive: true,
  roles: DEV_USER_ROLES,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

export type DevUserResponseDto = Omit<UserResponseDto, 'id'> & { id: null };
