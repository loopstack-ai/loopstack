import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { CurrentUserInterface } from '../interfaces/current-user.interface.js';

export const UserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: CurrentUserInterface }>();
  return request.user?.userId;
});
