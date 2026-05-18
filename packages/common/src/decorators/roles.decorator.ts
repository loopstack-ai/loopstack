import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/index.js';
import { RoleName } from '../enums/index.js';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
