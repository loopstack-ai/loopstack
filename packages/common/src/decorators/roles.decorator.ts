import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants';
import { RoleName } from '../enums';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
