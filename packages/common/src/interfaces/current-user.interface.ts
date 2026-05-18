import { UserTypeEnum } from '../enums/index.js';

export interface CurrentUserInterface {
  userId: string;
  type: UserTypeEnum;
  workerId: string;
  roles: string[];
}
