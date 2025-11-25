import { UserTypeEnum } from '../enums/user-type.enum';

export interface JwtPayloadInterface {
  sub: string;
  type: UserTypeEnum;
  workerId: string;
  roles: string[];
  iat?: number;
  exp?: number;
}