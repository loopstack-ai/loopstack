import { UserTypeEnum } from '../enums';

export interface CurrentUserInterface {
  userId: string;
  type: UserTypeEnum;
  workerId: string;
  roles: string[];
}
