import { RoleInterface } from './role.interface';

export interface UserInterface {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: RoleInterface[];
  createdAt: Date;
  updatedAt: Date;
}